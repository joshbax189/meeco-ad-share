import * as Meeco from '@meeco/sdk';
import { Keypair, KeypairResponse } from '@meeco/keystore-api-sdk';
import { Connection } from '@meeco/vault-api-sdk';
import * as cryppo from '@meeco/cryppo';
import * as m from 'mithril';

import environment from '../environment';
import { serviceUserAuth, servicePublicKey } from '../serviceUser';

import { TemplateSchemaStore, ItemTemplate } from './TemplateSchemaStore';
import JSONComponent from './JSONComponent.js';

const USER_AUTH_DATA = 'user_auth_data';

// Active user's AuthData from SessionStorage.
let AuthData = JSON.parse(sessionStorage.getItem(USER_AUTH_DATA) || '{}');
if (AuthData.data_encryption_key) {
  AuthData.data_encryption_key = Meeco.EncryptionKey.fromSerialized(AuthData.data_encryption_key);
  AuthData.key_encryption_key = Meeco.EncryptionKey.fromSerialized(AuthData.key_encryption_key);
  AuthData.passphrase_derived_key = Meeco.EncryptionKey.fromSerialized(AuthData.passphrase_derived_key);
}

let App = {
  authToken: AuthData.vault_access_token,
  userDEK: AuthData.data_encryption_key,

  loginService: new Meeco.UserService(environment),

  login: async function(userSecret: string, userPass: string) {
    console.log('begin auth');
    AuthData = await App.loginService.get(userPass, userSecret);
    console.log('finished auth');

    sessionStorage.setItem(USER_AUTH_DATA, JSON.stringify(AuthData));
    App.authToken = AuthData.vault_access_token;
    App.userDEK = AuthData.data_encryption_key.key;

    APIs.init();
  },
  logout: function() {
    sessionStorage.removeItem(USER_AUTH_DATA);
    App.authToken = '';
    App.userDEK = '';
  },
};

let APIs = {
  vaultFactory: Meeco.vaultAPIFactory(environment),
  ItemService: new Meeco.ItemService(environment),
  templates: undefined,
  init: function (): void {
    if (!App.authToken) return null;

    APIs.templates = new TemplateSchemaStore(environment.vault.url, App.authToken, environment.vault.subscription_key);
    // let userVault = APIs.vaultFactory({vault_access_token: App.authToken});
    // APIs.ItemTemplateAPI = userVault.ItemTemplateApi;
    // APIs.ItemAPI = userVault.ItemApi;

    console.log(APIs);
  },
};

function makeAuthHeaders(token: string) {
  return { 'Authorization': 'Bearer ' + token,
           'Meeco-Subscription-Key': environment.keystore.subscription_key };
}

function LoginComponent() {
  let secret = "1.xB2dP9.7JXpPj-qocZLf-MjT1XN-ULtA8H-8szT1f-SQz4U1-LifbZ6-ff";
  let pass = '';

  return {
    view: () =>
          m('form.pure-form', { onsubmit: (e: any) => {
              e.preventDefault();
              App.login(secret, pass);
          }}, [
              m('input', { type: "text", placeholder: "secret", value: secret, oninput: (e: any) => secret = e.target.value }),
              m('input', { type: "password", oninput: (e: any) => pass = e.target.value }),
              m('button[type="submit"].pure-button', 'Login'),
              m('button.pure-button', { onclick: () => App.logout() }, 'Logout'),
              m('input', { type: "text", placeholder: "Token", value: App.authToken, oninput: (e: any) => App.authToken = e.target.value }),
          ])
  };
}

/**
 * Create an ItemTemplate representing the given form.
 * @param formId
 */
function makeFormTemplate(formId: string): Promise<ItemTemplate> {

  let fieldNames = [];
  document.querySelectorAll('#' + formId + ' input').forEach((x: any) => fieldNames.push(x.name));

  // TODO may need a uniqueness component for template name
  return APIs.templates.saveUnlessExists({
    name: formId,
    label: 'Autogenerated form',
    slots_attributes: fieldNames.map(n => {return {label: n, slot_type_name: 'key_value'}})
  });
}

function collectSlotData(): Array<any> {
  let fields = [];
  document.querySelectorAll('#test-form input').forEach((x: Element) => fields.push({name: x.nodeName, value: x.nodeValue}));
  return fields;
}

// Does Item Exist? How to lookup? What if multiple?
function lookupItem(templateId: string) {
    return m.request({
      method: 'GET',
      url: environment.vault.url + '/items?template_ids=' + templateId,
      headers: { 'Authorization': 'Bearer ' + AuthData.vault_access_token,
                 'Meeco-Subscription-Key': environment.vault.subscription_key }
    }).then((data: any) => {
      console.log('found items');
      console.log(data.items);
      return data.items;
    });
}

// TODO
async function createItem(templateName: string, itemData: any[]) {
  let newItemResponse = await Promise.all(itemData.map((slot) => {
    return APIs.ItemService.encryptSlot(slot, App.userDEK);
  })).then(slots_attributes =>
    m.request({
      method: 'POST',
      url: environment.vault.url + '/items',
      headers: { 'Authorization': 'Bearer ' + App.authToken },
      body:{
        template_name: templateName,
        item: {
          label: 'Auto label',
          slots_attributes: slots_attributes
        }
      }
    }));

  let newItem = newItemResponse.item;
  return newItem;
}

async function connectHandler(invitationToken: string): Promise<Connection> {
  //create connection, if not exist
  //really just accepts the invitation...

  // const api = Meeco.keystoreAPIFactory(environment)(AuthData).KeypairApi
  const keyId = 'dog';

  let keyPair: Keypair;

  try {
    keyPair = await m.request({
      method: 'GET',
      url: environment.keystore.url + '/keypairs/external_id/' + keyId,
      headers: makeAuthHeaders(AuthData.keystore_access_token),
    }).then((r: KeypairResponse) => {
      console.log('Got KP response');
      return r.keypair;
    });
  } catch (e) {
    // TODO check it's really a 404
    console.log('creating a key for connection');

    const keyPairUn = await cryppo.generateRSAKeyPair();

    keyPair = await cryppo.encryptWithKey({
      data: keyPairUn.privateKey,
      key: AuthData.key_encryption_key.key,
      strategy: cryppo.CipherStrategy.AES_GCM,
    }).then(privateKeyEncrypted =>
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
        url: environment.keystore.url + '/keypairs',
        headers: makeAuthHeaders(AuthData.keystore_access_token),
        body: {
        public_key: keyPairUn.publicKey,
        encrypted_serialized_key: privateKeyEncrypted.serialized,
        // API will 500 without
        metadata: {},
          external_identifiers: [keyId],
        }
      }))
      .then((result: KeypairResponse) => {
        return result.keypair;
      });
  }

  // TODO cannot establish a connection...
  return await Meeco.vaultAPIFactory(environment)(AuthData).ConnectionApi.connectionsPost({
      public_key: {
        keypair_external_id: keyPair.external_identifiers[0],
        public_key: keyPair.public_key,
      },
      connection: {
        encrypted_recipient_name: 'nothing here',
        invitation_token: invitationToken,
      },
    })
    .then(res => res.connection);
}

async function createKeyPair(keyId: string, keystore_token: string) {
    console.log('creating a key for connection');

    const keyPairUn = await cryppo.generateRSAKeyPair();

    return cryppo.encryptWithKey({
      data: keyPairUn.privateKey,
      key: AuthData.key_encryption_key.key,
      strategy: cryppo.CipherStrategy.AES_GCM,
    }).then(privateKeyEncrypted =>
      m.request({
        method: 'POST',
        url: environment.keystore.url + '/keypairs',
        headers: makeAuthHeaders(keystore_token),
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

async function createInvite(vaultToken: string, keystoreToken: string, keyPairId: string, encryptedName: string) {
  // for other-user:
  const keyPair = await createKeyPair(keyPairId, keystoreToken);

  console.log('creating invite');
  return Meeco.vaultAPIFactory(environment)(vaultToken)
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

async function createInviteFromKey(vaultToken: string, publicKey: string, keyPairId: string, encryptedName: string) {
  console.log('creating invite');
  return m.request({
    method: 'POST',
    url: environment.vault.url + '/invitations',
    headers: makeAuthHeaders(vaultToken),
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
          email: 'joshbax189@gmail.com'
        },
    }
  }).then((result: any) => {
      console.log(result.invitation);
      return result.invitation;
    });
}


window.onload = () => {
  document.getElementById('test-form').hidden = true;

  APIs.init();

  m.mount(document.getElementById('auth'), LoginComponent);

  // createInvite(serviceUserAuth.vault_access_token, serviceUserAuth.keystore_access_token, 'funny_hat', 'fake-name');
//   createInviteFromKey(serviceUserAuth.vault_access_token, servicePublicKey, 'funny_hat', 'Aes256Gcm.6xtPqA==.LS0tCml2OiAhYmluYXJ5IHwtCiAgWG9mS2U1WTBodmJPbVlrRAphdDogIWJpbmFyeSB8LQogIGErMi95SXZ2dnBMQytmeVdmYjVWekE9PQphZDogbm9uZQo=');

  document.getElementById('ad-target').onclick = () => {
    alert('I send connect request!');
    // Get Invite
    const inviteToken = document.getElementById('ad-target').attributes.getNamedItem('data-meeco-invite').value;

    // let connection = connectHandler(inviteToken).then(c => {
    //   // get back recipient_id
    //   console.log('connection is');
    //   console.log(c);
    //   return c;
    // });

    // let recipient = connection.user_id;
    // also some form_id for 'next_steps'
    // then show form
    document.getElementById('test-form').hidden = false;

    const templateName = 'fake_template';

    APIs.templates.loadTemplates().then(() => {
      console.log('creating template');
      makeFormTemplate('test-form');

      let template = APIs.templates.getTemplateByName(templateName);

      // Items may exist!
      lookupItem(template.id).then(existingItems => {

        if (existingItems.length > 0) {
          console.log('autofill');
          document.getElementById('test-form').insertAdjacentHTML('afterend', '<button>Autofill</button>');
        }

        document.getElementById('submit-target').onclick = e => {
          e.preventDefault();
          // TODO Create Connect
          // const service = Meeco.ConnectionService(environment).createConnection({from: _, to: _, options: _});

          createItem(templateName, collectSlotData()).then(d => {
            console.log(d);
            m.mount(document.getElementById('item-output'), JSONComponent(d));
          });
          // Once created -> share with Org/Service

          // TODO
          // Get {OrgId/service/Id}.agent_id

          // TODO Create Connect

          // TODO Create Share
          // TODO Send Invite
        };

      });
    });
  };
}
