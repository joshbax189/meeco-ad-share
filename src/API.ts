import * as cryppo from '@meeco/cryppo';
import { Keypair, KeypairResponse } from '@meeco/keystore-api-sdk';
import * as Meeco from '@meeco/sdk';
import { Connection, ConnectionsResponse, Invitation, InvitationResponse } from '@meeco/vault-api-sdk';
import * as m from 'mithril';

const ENCRYPTION = 'Aes256Gcm';   // not sure if cryppo style or this?
const MOCK_ENCRYPTED_NAME = 'Aes256Gcm.6xtPqA==.LS0tCml2OiAhYmluYXJ5IHwtCiAgWG9mS2U1WTBodmJPbVlrRAphdDogIWJpbmFyeSB8LQogIGErMi95SXZ2dnBMQytmeVdmYjVWekE9PQphZDogbm9uZQo=';

export default class API {
  private vaultAPIFactory: Meeco.VaultAPIFactory;

  constructor(private environment: any) {
    this.vaultAPIFactory = Meeco.vaultAPIFactory(environment);
  }

  /**
   * @param keyName The external identifier of the new key.
   * @param key_encryption_key
   * @param keystoreToken
   */
  async createKeyPair(keyName: string, key_encryption_key: string, keystoreToken: string): Promise<Keypair> {
    console.log('creating a key for connection');

    const api = Meeco.keystoreAPIFactory(this.environment)(keystoreToken).KeypairApi;

    const keyPairUn = await cryppo.generateRSAKeyPair();
    const privateKeyEncrypted = await cryppo.encryptWithKey({
      data: keyPairUn.privateKey,
      key: key_encryption_key,
      strategy: cryppo.CipherStrategy.AES_GCM,
    });

    return api.keypairsPost({
      public_key: keyPairUn.publicKey,
      encrypted_serialized_key: privateKeyEncrypted.serialized,
      // API will 500 without
      metadata: {},
      external_identifiers: [keyName]
    }).then((result: KeypairResponse) => {
      console.log(result.keypair);
      return result.keypair;
    });
  }

  async getOrCreateKeyPair(keyId: string, key_encryption_key: string, keystore_access_token: string) {
    return await m.request({
      method: 'GET',
      url: this.environment.keystore.url + '/keypairs/external_id/' + keyId,
      headers: this.makeAuthHeaders(keystore_access_token),
    }).then((r: KeypairResponse) => {
      console.log('Got KP response');
      return r.keypair;
    }).catch(() => {
      // TODO check it's really a 404
      console.log('creating a key for connection');

      return this.createKeyPair(keyId, key_encryption_key, keystore_access_token);
    });
  }

  // TODO this won't work for SANDBOX, which wants keypairId == key.id
  async createInvite(vaultToken: string, keystoreToken: string, keyPairId: string, key_encryption_key: string): Promise<Invitation> {
    // for other-user:
    const keyPair = await this.createKeyPair(keyPairId, keystoreToken, key_encryption_key);

    console.log('creating invite');
    return Meeco.vaultAPIFactory(this.environment)(vaultToken)
      .InvitationApi.invitationsPost({
        public_key: {
          keypair_external_id: keyPairId,
          public_key: keyPair.public_key,
        },
        invitation: {
          encrypted_recipient_name: MOCK_ENCRYPTED_NAME,
        },
      })
      .then((result: any) => {
        console.log(result.invitation);
        return result.invitation;
      });
  }

  // Note that keyPairId 'should' be an external_id, but presently it is not checked.
  async createInviteFromKey(vaultToken: string, publicKey: string, keyPairId: string): Promise<Invitation> {
    console.log('creating invite');

    return Meeco.vaultAPIFactory(this.environment)(vaultToken)
      .InvitationApi.invitationsPost({
        public_key: {
          keypair_external_id: keyPairId,
          public_key: publicKey,
        },
        invitation: {
          encrypted_recipient_name: MOCK_ENCRYPTED_NAME,
        },
      })
      // There are extra fields in invitation that are not permitted by the typed API
      // return m.request({
      //   method: 'POST',
      //   url: this.environment.vault.url + '/invitations',
      //   headers: this.makeAuthHeaders(vaultToken),
      //   body: {
      //     public_key: {
      //       keypair_external_id: keyPairId,
      //       // key_store_id: keyPairId,
      //       encryption_strategy: ENCRYPTION,
      //       public_key: publicKey,
      //     },
      //     invitation: {
      //       encrypted_recipient_name: encryptedName,
      //       invited_user_id: '68a2cdb3-4a9d-42ac-83e7-d7e4967143a0',
      //       // email: 'joshbax189@gmail.com',
      //       message: 'Hi son!',
      //     },
      //   }
      // })
      .then((result: InvitationResponse) => {
        console.log(result.invitation);
        return result.invitation;
      });
  }

  // Can't use current SDK because of key_store_id requirement in SANDBOX
  async acceptInvite(vaultToken: string, invite: string, keyId: string, publicKey: string): Promise<Connection> {
    return Meeco.vaultAPIFactory(this.environment)(vaultToken)
      .ConnectionApi.connectionsPost({
        public_key: {
          keypair_external_id: keyId,
          public_key: publicKey
        },
        connection: {
          encrypted_recipient_name: MOCK_ENCRYPTED_NAME,
          invitation_token: invite,
        },
      })
      .then(res => res.connection);

    /*return m.request({
      method: 'POST',
      url: this.environment.vault.url + '/connections',
      headers: this.makeAuthHeaders(vaultToken),
      body: {
        public_key: {
          encryption_strategy: ENCRYPTION,
          key_store_id: keyId,
          public_key: publicKey,
        },
        key_store_id: keyId,
        connection: {
          invitation_token: invite,
          encrypted_recipient_name: 'bread_dog'
        },
      }
    });*/
  }

  // Does Item Exist? What if multiple?
  async lookupItem(templateId: string, vault_access_token: string) {
    return m.request({
      method: 'GET',
      url: this.environment.vault.url + '/items?template_ids=' + templateId,
      headers: this.makeAuthHeaders(vault_access_token),
    }).then((data: any) => {
      let slotMap = {};

      data.slots.forEach(x => {
        slotMap[x.id] = x;
      });

      data.items.forEach(i => {
        i.slots = i.slot_ids.map(y => slotMap[y]);
      });

      return data.items;
    });
  }

  // TODO
  async createItem(templateName: string, itemData: any[], userDEK: string, vault_access_token: string) {
    let newItemResponse = await Promise.all(itemData.map((slot) => {
      return this.encryptSlot(slot, userDEK);
    }))
      .then(slots_attributes => this.vaultAPIFactory(vault_access_token).ItemApi.itemsPost({
        template_name: templateName,
        item: {
          label: 'Auto Label',
          slots_attributes,
        },
      }));

    let newItem = newItemResponse.item;
    return newItem;
  }

  async shareItem(keys: Meeco.AuthData, connectionId: string, itemId: string) {
    const service = new Meeco.ShareService(this.environment);
    const shareOptions = {
      sharing_mode: "owner",
      acceptance_required: "acceptance_not_required",
    }
    return service.shareItem(keys, connectionId, itemId, shareOptions);
  }

  async getOrAcceptConnection(vaultToken: string, invite: string, keyId: string, publicKey: string, otherUserId: string): Promise<Connection> {
    const connectionData: ConnectionsResponse = await m.request({
      method: 'GET',
      url: this.environment.vault.url + '/connections',
      headers: this.makeAuthHeaders(vaultToken),
    });

    let conn = connectionData.connections.find(c => c.the_other_user.user_id == otherUserId);

    if (!conn) {
      return this.acceptInvite(vaultToken, invite, keyId, publicKey);
    } else {
      return conn;
    }
  }

  // Note that this will not decrypt the shares
  async getOutShares(vaultToken: string) {
    return m.request({
      method: 'GET',
      url: this.environment.vault.url + '/outgoing_shares',
      headers: this.makeAuthHeaders(vaultToken),
    }).then((data: any) => data.shares);
  }

  async getInShares(keys: Meeco.AuthData): Promise<any[]> {
    const service = new Meeco.ShareService(this.environment);

    // function processSharedItem(s: { item: Item, slots: any[] }) {
    //   const slotsMap = s.slots.reduce((acc, slot) => { acc[slot.id] = slot; return acc }, {});
    //   s.item['slots'] = s.item.slot_ids.map(id => slotsMap[id]);
    //   return s.item;
    // }

    return service.listShares(keys, Meeco.ShareType.incoming).then(sharesResponse =>
      Promise.all(sharesResponse.shares.map(share => service.getSharedItemIncoming(keys, share.id)))); //.then(processSharedItem))));
  }

  private makeAuthHeaders(token: string) {
    return {
      'Authorization': 'Bearer ' + token,
      'Meeco-Subscription-Key': this.environment.keystore.subscription_key
    };
  }

  private async encryptSlot(slot: Meeco.DecryptedSlot, dek: string) {
    const encrypted: any = {
      ...slot,
    };
    encrypted.encrypted_value = await cryppo
      .encryptWithKey({
        strategy: cryppo.CipherStrategy.AES_GCM,
        key: dek,
        data: slot.value || '',
      })
      .then(result => result.serialized);
    delete encrypted.value;
    encrypted.encrypted = true;
    return encrypted;
  }


}
