import { Keypair } from '@meeco/keystore-api-sdk';
import { Invitation, Item, Share } from '@meeco/vault-api-sdk';

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
  createInvite(publicKey: string, keyId: string): Promise<Invitation> {
    return Promise.resolve({
      id: '123',
      email: '',
      message: '',
      sent_at: null,
      invited_user_id: '',
      token: FAKE_TOKEN,
      user_name: '',
      user_email: '',
      user_image: '',
      outgoing: false,
      keypair_external_id: keyId,
      integration_data: null,
      encrypted_recipient_name: '',
    });
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
      valid_share_count: 0
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
    });
  },
  getShare(): Promise<Share> {
    return Promise.resolve({
      id: '123',
      sender_id: '',
      recipient_id: '',
      outgoing: false,
      shareable_type: '',
      shareable_id: '',
      item_id: '',
      encryption_space_id: null,
      connection_id: '',
      note: null,
      expires_at: null,
      terms: null,
      tradeable: false,
      distributable: false,
    });
  }
}
