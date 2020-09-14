import { Keypair, KeypairResponse } from '@meeco/keystore-api-sdk';
import * as m from 'mithril';
import * as cryppo from '@meeco/cryppo';
import * as Meeco from '@meeco/sdk';

export default class API {
  private vaultAPIFactory: Meeco.VaultAPIFactory;

  constructor(private environment: any) {
    // this.environment = environment;
    this.vaultAPIFactory = Meeco.vaultAPIFactory(environment);
  }

  async createKeyPair(keyId: string, key_encryption_key: string, keystoreToken: string): Promise<Keypair> {
    console.log('creating a key for connection');

    const keyPairUn = await cryppo.generateRSAKeyPair();

    return cryppo.encryptWithKey({
      data: keyPairUn.privateKey,
      key: key_encryption_key,
      strategy: cryppo.CipherStrategy.AES_GCM,
    }).then(privateKeyEncrypted =>
      // TODO can just use this
      // const api = Meeco.keystoreAPIFactory(environment)(AuthData).KeypairApi
      // api.keypairsPost({
      //   public_key: keyPairUn.publicKey,
      //   encrypted_serialized_key: privateKeyEncrypted.serialized,
      //   // API will 500 without
      //   metadata: {},
      //   // TODO this is for the v1 sandbox
      //   external_identifiers: (environment.keystore.subscription_key ? keyId : [keyId]),
      // })
      m.request({
        method: 'POST',
        url: this.environment.keystore.url + '/keypairs',
        headers: this.makeAuthHeaders(keystoreToken),
        body: {
          public_key: keyPairUn.publicKey,
          encrypted_serialized_key: privateKeyEncrypted.serialized,
          // API will 500 without
          metadata: {},
          external_identifiers: [keyId],
        }
      }))
      .then((result: KeypairResponse) => {
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

  async createInvite(vaultToken: string, keystoreToken: string, keyPairId: string, key_encryption_key: string, encryptedName: string) {
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
          encrypted_recipient_name: encryptedName,
        },
      })
      .then(result => {
        console.log(result.invitation);
        return result.invitation;
      });
  }

  // TODO this fails for sandbox
  async createInviteFromKey(vaultToken: string, publicKey: string, keyPairId: string, encryptedName: string) {
    console.log('creating invite');
    return m.request({
      method: 'POST',
      url: this.environment.vault.url + '/invitations',
      headers: this.makeAuthHeaders(vaultToken),
      body: {
        public_key: {
          // keypair_external_id: keyPairId,
          keypair_id: '8a3abe43-2c35-4ad4-9075-80a1aef763ba',
          encryption_strategy: 'Aes256Gcm',
          public_key: publicKey,
        },
        invitation: {
          encrypted_recipient_name: encryptedName,
          message: 'hi mom',
          email: 'fake@gmail.com'
        },
      }
    }).then((result: any) => {
      console.log(result.invitation);
      return result.invitation;
    });
  }

  // Does Item Exist? What if multiple?
  async lookupItem(templateId: string, vault_access_token: string) {
    return m.request({
      method: 'GET',
      url: this.environment.vault.url + '/items?template_ids=' + templateId,
      headers: this.makeAuthHeaders(vault_access_token),
    }).then((data: any) => {
      console.log('found items');
      console.log(data.items);
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

  private makeAuthHeaders(token: string) {
    return { 'Authorization': 'Bearer ' + token,
             'Meeco-Subscription-Key': this.environment.keystore.subscription_key };
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
