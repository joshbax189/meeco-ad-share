import * as Meeco from '@meeco/sdk';
import { Keypair } from '@meeco/keystore-api-sdk';
import { Item } from '@meeco/vault-api-sdk';
import * as m from 'mithril';

import environment from './environment.js';
import { serviceUserAuth, serviceUserId, serviceUserKeyId } from './serviceUser';

import { TemplateSchemaStore, ItemTemplate } from './TemplateSchemaStore';
import JSONComponent from './JSONComponent.js';
//import MeecoForm from './MeecoForm';
import API from './API';
//import { FakeAPI } from './FakeAPI';

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
  templates: undefined,
  loginService: new Meeco.UserService(environment),

  login: async function(userSecret: string, userPass: string) {
    console.log('begin auth');
    AuthData = await App.loginService.get(userPass, userSecret);
    console.log('finished auth');

    sessionStorage.setItem(USER_AUTH_DATA, JSON.stringify(AuthData));
    App.authToken = AuthData.vault_access_token;
    App.userDEK = AuthData.data_encryption_key.key;
    App.templates = new TemplateSchemaStore(environment.vault.url, App.authToken, environment.vault.subscription_key);
  },
  logout: function() {
    sessionStorage.removeItem(USER_AUTH_DATA);
    App.authToken = '';
    App.userDEK = '';
  },
};

// Default load
if (AuthData.vault_access_token) {
  App.templates = new TemplateSchemaStore(environment.vault.url, AuthData.vault_access_token, environment.vault.subscription_key);
}

const api = new API(environment);

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

  let templateName = document.getElementById(formId).attributes.getNamedItem('data-meeco-template-name').value;

  console.log('creating template: ' + templateName);

  // TODO may need a uniqueness component for template name
  return App.templates.saveUnlessExists({
    name: templateName,
    label: 'Autogenerated ' + templateName,
    slots_attributes: fieldNames.map(n => {return {label: n, slot_type_name: 'key_value'}})
  });
}

function collectSlotData(formId: string): Array<any> {
  let fields = [];
  document.querySelectorAll('#' + formId + ' input').forEach((x: Element) => fields.push({name: x.nodeName, value: x.nodeValue}));
  return fields;
}

/*
function drawExistingItem(item: Item) {
  console.log('autofill items');
  document.getElementById('test-form').insertAdjacentHTML('afterend', '<button>Autofill</button>');
  m.mount(document.getElementById('item-output'), JSONComponent(item));
}
*/

function drawShares(shares: any[]) {
  const component = {
    view: () => shares.map(t => m('li.pure-menu-item',
                                  m('a.pure-menu-link', ['item: ', t.item_id, '/ rec: ', t.recipient_id])))
  }
  m.mount(document.getElementById('user-shares-list'), component);
}


function drawItems(items: Item[]) {
  const component = {
    view: () => items.map(t => m('li.pure-menu-item', m('a.pure-menu-link', [t.label + ': ', m('i', t.item_template_label)])))
  }
  m.mount(document.getElementById('user-items-list'), component);
}

function drawTemplates(templates: ItemTemplate[]) {
  const component = {
    view: () => templates.map(t => m('li.pure-menu-item', m('a.pure-menu-link', t.label)))
  }
  m.mount(document.getElementById('templates-list'), component);
}

async function makeInvite(domId: string) {
  // Generate an invite to accompany the form
  return api.getOrCreateKeyPair(serviceUserKeyId,
                         Meeco.EncryptionKey.fromSerialized(serviceUserAuth.key_encryption_key).key,
                         serviceUserAuth.keystore_access_token)
    .then((keypair: Keypair) =>
      api.createInviteFromKey(serviceUserAuth.vault_access_token,
                              keypair.public_key,
                              keypair.id,
                              'ThisNameIsTotallyEncrypted'))
    .then((invite: any) => {
      document.getElementById(domId).attributes.getNamedItem('data-meeco-invite').value=invite.token;
      return invite.token;
    });
}

// Entry point
window.onload = async () => {
  document.getElementById('test-form').hidden = true;

  m.mount(document.getElementById('auth'), LoginComponent);

  const realInvite = await makeInvite('ad-target');

  //Draw templates
  App.templates.templates.then(drawTemplates);

    // Connections
    let userKeyId = 'donkey';
    let connection = api.getOrCreateKeyPair(userKeyId, AuthData.key_encryption_key.key, AuthData.keystore_access_token)
      .then((userKeyPair: Keypair) =>
        api.getOrAcceptConnection(AuthData.vault_access_token, realInvite, userKeyPair.id,
                                  userKeyPair.public_key, serviceUserId))
      .then(c => {
        // get back recipient_id
        console.log('connection is');
        console.log(c);
        return c;
      });

    // show form
    document.getElementById('test-form').hidden = false;

    makeFormTemplate('test-form')
      .then((template: ItemTemplate) => {
        // Items may exist!
        api.lookupItem(template.id, AuthData.vault_access_token)
          .then((existingItems: Item[]) => {

            if (existingItems.length > 0) {
              drawItems(existingItems);
            }
          });

        document.getElementById('submit-target').onclick = e => {
          e.preventDefault();

          api.createItem(template.name, collectSlotData('test-form'),
                         AuthData.data_encryption_key.key, AuthData.vault_access_token)
            .then((item: Item) => {
              connection.then((c: any) => {
                const share = api.shareItem(AuthData, c.id, item.id, {});
                console.log('share created');
                console.log(share);
              }).then(() =>
                api.getOutShares(AuthData.vault_access_token).then(drawShares));

              // TODO callback to notify receiver!
            });
        }; //end submit handler
      });
  }
}
