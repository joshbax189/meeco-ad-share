import { Keypair } from '@meeco/keystore-api-sdk';
import { Invitation, Item, Share, Connection } from '@meeco/vault-api-sdk';

const FAKE_TOKEN = 'token123';
const FAKE_PUB_KEY = 'public_key123';

export const FakeAPI = {
  getOrCreateKeyPair(keyId: string): Promise<Keypair> {
    return Promise.resolve({
      id: '123',
      public_key: FAKE_PUB_KEY,
      encrypted_serialized_key: '',
      metadata: {},
      external_identifiers: [keyId]
    });
  },
  createInvite(publicKey: string, keyId: string, encryptedName: string = ''): Promise<Invitation> {
    return Promise.resolve({
      id: '123',
      email: '',
      message: '',
      sent_at: null,
      invited_user_id: '',
      token: FAKE_TOKEN,
      user_name: 'Anonymous User',
      user_email: '',
      user_image: '',
      outgoing: false,
      keypair_external_id: keyId,
      integration_data: null,
      encrypted_recipient_name: encryptedName,
    });

    // old style example
    // return Promise.resolve({
    //   "id": "99fb111e-a8cc-43b6-9013-1fc9c25b00a5",
    //   "email": "fake@gmail.com",
    //   "message": "hi mom",
    //   "sent_at": null,
    //   "invited_user_id": null,
    //   "token": "Ico8bqU0mqRIpsHeZmYf0pc-HiLYYamSZk7yqPSSCzM",
    //   "outgoing": true,
    //   "user_name": "Anonymous User",
    //   "user_image": null,
    //   "user_email": "",
    //   "key_store_keypair_id": "8a3abe43-2c35-4ad4-9075-80a1aef763ba",
    //   "encrypted_recipient_name": "Aes256Gcm.6xtPqA==.LS0tCml2OiAhYmluYXJ5IHwtCiAgWG9mS2U1WTBodmJPbVlrRAphdDogIWJpbmFyeSB8LQogIGErMi95SXZ2dnBMQytmeVdmYjVWekE9PQphZDogbm9uZQo="
    // });
  },
  acceptInvite(token: string) {
    return Promise.resolve();
  },
  getOrCreateTemplate(name: string, slots: any[]) {
    return Promise.resolve({
      id: '123',
      name: name,
      slot_ids: [],
    });
  },
  createItem(label: string, slots: any[]): Promise<Item> {
    return Promise.resolve({
      id: '123',
      description: '',
      name: label,
      label: label,
      slot_ids: [],
      ordinal: 0,
      created_at: new Date('2020-01-01'),
      updated_at: new Date('2020-01-01'),
      own: true,
      item_template_id: '',
      item_template_label: '',
      visible: false,
      shareable: true,
      image: null,
      item_image: null,
      item_image_background_colour: null,
      association_ids: [],
      associations_to_ids: [],
      classification_node_ids: [],
      me: false,
      background_color: null,
      share_count: 0,
      valid_share_count: 0,
      original_id: '',
      owner_id: '',
      share_id: '',
    });
  },
  createShare(itemId: string, receiverId: string): Promise<Share> {
    return Promise.resolve({
      id: '123',
      sender_id: '',
      recipient_id: receiverId,
      outgoing: false,
      shareable_type: '',
      shareable_id: '',
      item_id: itemId,
      encryption_space_id: null,
      connection_id: '',
      note: null,
      expires_at: null,
      terms: null,
      tradeable: false,
      distributable: false,
      owner_id: '',
      original_id: '',
      share_id: '',
      slot_id: '',
      public_key: '',
      sharing_mode: '',
      acceptance_required: '',
      created_at: new Date('2020-01-01'),
      keypair_external_id: '',
      encrypted_dek: '',
    });
  },
  connection(keyId: string, publicKey: string, otherUserId: string): Promise<Connection> {
    return Promise.resolve({
      own: {
        id: '',
        encrypted_recipient_name: '',
        integration_data: {},
        connection_type: '',
        user_image: '',
        user_type: '',
        user_public_key: publicKey,
        user_keypair_external_id: keyId,
      },
      the_other_user: {
        id: otherUserId,
        integration_data: {},
        connection_type: '',
        user_id: '',
        user_image: '',
        user_type: '',
        user_public_key: '',
        user_keypair_external_id: '',
      }
    });
  },
}
