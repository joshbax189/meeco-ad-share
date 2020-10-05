import API from './API';
import MeecoForm from './MeecoForm';
import { ItemTemplate, TemplateSchemaStore } from './TemplateSchemaStore';


import { Keypair } from '@meeco/keystore-api-sdk';
import * as Meeco from '@meeco/sdk';
import { Connection, Invitation, Item } from '@meeco/vault-api-sdk';
import * as m from 'mithril';
import * as ENV from '../environment.yaml';
import * as SU from '../service_user_auth.yaml';
import * as SU_INFO from '../service_user_info.yaml';
import * as UA from '../user_auth.yaml';

type env = {
  vault: {
    url: string;
    subscription_key: string;
  },
  keystore: {
    url: string;
    subscription_key: string;
  }
}

const environment = (ENV as unknown) as env;
const serviceUserAuth = deserializeAuthData((SU as any).metadata);
const serviceUserId = (SU_INFO as any).spec.id;
// Arbitrary identifier for a keypair
const SERVICE_USER_KEY_ID = 'dog';

const USER_AUTH_DATA = 'user_auth_data';

function deserializeAuthData(serialized: any) {
  let result = { ...serialized };
  result.data_encryption_key = Meeco.EncryptionKey.fromSerialized(serialized.data_encryption_key);
  result.key_encryption_key = Meeco.EncryptionKey.fromSerialized(serialized.key_encryption_key);
  result.passphrase_derived_key = Meeco.EncryptionKey.fromSerialized(serialized.passphrase_derived_key);
  return result;
}

// Active user's AuthData from SessionStorage.
let AuthData = JSON.parse(sessionStorage.getItem(USER_AUTH_DATA) || '{}');
if (AuthData.data_encryption_key) {
  AuthData = deserializeAuthData(AuthData);
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
  let secret = (UA as any).metadata.secret;
  let pass = '';

  return {
    view: () =>
      m('form.pure-form', {
        onsubmit: (e: any) => {
          e.preventDefault();
          App.login(secret, pass);
        }
      }, [
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
 * @param formId DOM id for the form. It should have attribute data-meeco-template-name.
 */
function makeFormTemplate(formId: string): Promise<ItemTemplate> {
  let fieldNames = [];
  document.querySelectorAll('#' + formId + ' input.meeco-slot').forEach((x: any) => fieldNames.push(x.name));

  let templateName = document.getElementById(formId).attributes.getNamedItem('data-meeco-template-name').value;

  console.log('creating template: ' + templateName);

  // TODO may need a uniqueness component for template name
  return App.templates.saveUnlessExists({
    name: templateName,
    label: 'Autogenerated ' + templateName,
    slots_attributes: fieldNames.map(n => { return { label: n, slot_type_name: 'key_value' } })
  });
}

function collectSlotData(formId: string): Array<{ name: string, value: string }> {
  let fields = [];
  document.querySelectorAll('#' + formId + ' input.meeco-slot').forEach((x: any) => fields.push({ name: x.name, value: x.value }));
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
  function fillFields(item: any) {
    Meeco.ItemService.decryptAllSlots(item.slots, AuthData.data_encryption_key)
      .then(slots => {
        let slotMap = {};
        slots.forEach(x => {
          slotMap[x.name] = x.value;
        });

        console.log(slotMap);

        document.querySelectorAll('#test-form input.meeco-slot')
          .forEach((x: any) => {
            const newVal = slotMap[x.name];
            if (newVal) {
              x.value = newVal
            }
          });
      });
  }

  const component = {
    view: () => items.map(t =>
      m('li.pure-menu-item',
        m('a.pure-menu-link',
          { onclick: () => { console.log(t); fillFields(t); } },
          [t.label + ': ', m('i', t.item_template_label)])))
  }
  m.mount(document.getElementById('user-items-list'), component);
}

function drawTemplates(templates: ItemTemplate[]) {
  const hidden = ['Category', 'Tags', 'Image'];
  const loadForm = (template: ItemTemplate) => {
    m.mount(document.getElementById('auto-form'),
      MeecoForm(template.slots.reduce((acc, slot) => {
        if (!hidden.includes(slot.label)) {
          acc[slot.label] = { type: 'text', name: slot.name };
        }
        return acc;
      }, {}), 'test-form', template.name, template.label));
    document.dispatchEvent(new CustomEvent('template-change', { detail: template }));
  }

  const component = {
    view: () => templates.map(t => m('li.pure-menu-item',
      m('a.pure-menu-link', { onclick: () => { loadForm(t) } }, t.label)))
  }
  m.mount(document.getElementById('templates-list'), component);
}

async function makeInvite(domId: string) {
  // Generate an invite to accompany the form
  return api.getOrCreateKeyPair(SERVICE_USER_KEY_ID,
    serviceUserAuth.key_encryption_key.key,
    serviceUserAuth.keystore_access_token)
    .then((keypair: Keypair) =>
      api.createInviteFromKey(serviceUserAuth.vault_access_token,
        keypair.public_key,
        keypair.id))
    .then((invite: Invitation) => {
      document.getElementById(domId).attributes.getNamedItem('data-meeco-invite').value = invite.token;
      return invite.token;
    });
}

async function makeConnection(invite: string): Promise<Connection> {
  let userKeyId = 'donkey';
  return api.getOrCreateKeyPair(userKeyId, AuthData.key_encryption_key.key, AuthData.keystore_access_token)
    .then((userKeyPair: Keypair) =>
      api.getOrAcceptConnection(AuthData.vault_access_token, invite, userKeyPair.id,
        userKeyPair.public_key, serviceUserId))
    .then(c => {
      // get back recipient_id
      console.log('connection is');
      console.log(c);
      return c;
    });
}

function makeAdHandler(connection: Promise<Connection>, template: ItemTemplate) {

  // Items may exist!
  api.lookupItem(template.id, AuthData.vault_access_token)
    .then((existingItems: Item[]) => {
      if (existingItems.length > 0) {
        drawItems(existingItems);
      }
    });

  document.querySelector('#test-form input[type="submit"]').addEventListener('click', e => {
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
  }); //end submit handler
}

// Entry point
window.onload = async () => {
  document.getElementById('test-form').hidden = true;

  m.mount(document.getElementById('auth'), LoginComponent);

  const realInvite = await makeInvite('ad-target');

  //Draw templates
  App.templates.templates.then(drawTemplates);

  document.getElementById('ad-target').onclick = () => {

    let connection = makeConnection(realInvite);

    document.addEventListener('template-change', e => {
      makeAdHandler(connection, e['detail']);
    });

    // show form
    document.getElementById('test-form').hidden = false;

    makeFormTemplate('test-form')
      .then((template: ItemTemplate) => makeAdHandler(connection, template));

  }

}
