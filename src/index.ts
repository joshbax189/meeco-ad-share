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

const environment = (ENV as unknown) as Meeco.Environment;
const serviceUserAuth = deserializeAuthData((SU as any).metadata);
const serviceUserId = (SU_INFO as any).spec.id;
// Arbitrary identifier for a keypair
const SERVICE_USER_KEY_ID = 'dog';

const USER_AUTH_DATA = 'user_auth_data';

function deserializeAuthData(serialized: any): Meeco.AuthData {
  let result = { ...serialized };
  result.data_encryption_key = Meeco.EncryptionKey.fromSerialized(serialized.data_encryption_key);
  result.key_encryption_key = Meeco.EncryptionKey.fromSerialized(serialized.key_encryption_key);
  result.passphrase_derived_key = Meeco.EncryptionKey.fromSerialized(serialized.passphrase_derived_key);
  return result;
}

// Active user's AuthData from SessionStorage.
let AuthData = JSON.parse(sessionStorage.getItem(USER_AUTH_DATA)) || (UA as any).metadata || '{}';

if (AuthData.data_encryption_key) {
  AuthData = deserializeAuthData(AuthData);
}

console.log(`Stored user auth:`);
console.log(AuthData);

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
  let secret = AuthData.secret;
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

function makeTagsForOptions(fieldName: string, options: Array<{ label: string, value: string }>) {
  // TODO make a scheme
  // but we can't make our own schemes...
  // instead use a common prefix and then do a like search

  // upload all options indexed by the scheme, or do some other hack?
  options.forEach(option => {
    App.templates.saveTag(`options_${fieldName}_${option.value}`, option.label);
  });
}

function inputTypeToSlotType(ty: string): string {
  // TODO also have select-multiple
  switch (ty) {
    case 'checkbox':
      return 'bool';
    case 'password':
      return 'password';
    case 'date':
      return 'date';
    case 'select-one':
      return 'classification_node';
    case 'text':
    default:
      return 'key_value';
  }
}

/**
 * Create an ItemTemplate representing the given form.
 * @param formId DOM id for the form. It should have attribute data-meeco-template-name.
 */
function makeFormTemplate(formId: string): Promise<ItemTemplate> {
  let fieldNames: { name: string, label: string, type: string, description?: string }[] = [];
  document.querySelectorAll('#' + formId + ' .meeco-slot').forEach((x: any) => {
    const type = inputTypeToSlotType(x.type);
    let description: string;
    if (type == 'classification_node') {
      const opts = x.querySelectorAll('option');
      makeTagsForOptions(x.name, opts);
      description = JSON.stringify({classification_scheme_name: 'tag',
                                    selection_type: 'single',
                                    type: 'select',
                                    special_prefix: 'options_'+x.name+'_'});
    }

    let res = {
      name: x.name,
      label: '',
      type,
      description,
    };
    res.label = document.querySelector('label[for="' + x.name + '"]').textContent;
    fieldNames.push(res);
  });

  const templateName = document.getElementById(formId).attributes.getNamedItem('data-meeco-template-name').value;

  // TODO may need a uniqueness component for template name
  return App.templates.saveUnlessExists({
    name: templateName,
    label: 'Autogenerated ' + templateName,
    slots_attributes: fieldNames.map(({ type, ...rest }) => {
      return { slot_type_name: type, ...rest };
    })
  });
}

function collectSlotData(formId: string): Array<{ name: string, value: string }> {
  let fields = [];
  document.querySelectorAll('#' + formId + ' .meeco-slot').forEach((x: any) => fields.push({ name: x.name, value: x.value }));
  return fields;
}

/*
   function drawExistingItem(item: Item) {
   console.log('autofill items');
   document.getElementById('test-form').insertAdjacentHTML('afterend', '<button>Autofill</button>');
   m.mount(document.getElementById('item-output'), JSONComponent(item));
   }
 */

function OutgoingSharesMenuComponent(shares: any[]) {
  return {
    view: () => shares.map(t => m('li.pure-menu-item',
                                  m('a.pure-menu-link', ['item: ', t.item_id, '/ rec: ', t.recipient_id])))
  };
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

        document.querySelectorAll('#test-form .meeco-slot')
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

function TemplatesMenuComponent(templates: ItemTemplate[]) {

  const loadForm = (template: ItemTemplate) => {
    console.log(`template ${template.name}`);
    console.log(template);
    m.mount(document.getElementById('auto-form'),
      MeecoForm(template, App.templates, 'test-form'));
    document.dispatchEvent(new CustomEvent('template-change', { detail: template }));
  }

  return {
    view: () => templates.map(t => m('li.pure-menu-item',
      m('a.pure-menu-link', { onclick: () => { loadForm(t) } }, t.label)))
  };
}

function drawSharedItems(shares: any[]) {
  const component = {
    // TODO for now just draw the first share
    view: () => [shares[0]].map(t => m('li.pure-menu-item', [
      m('span', t.label + ': ' + t.item_template_label),
      m('ul', t.slots.map(s =>
        m('li', s.label + '= ' + s.value)
      ))
    ]))
  }
  m.mount(document.getElementById('service-shares-list'), component);
}

/** Generate an invite to accompany the form */
async function makeInvite(): Promise<string> {
  const keypair: Keypair = await api.getOrCreateKeyPair(SERVICE_USER_KEY_ID,
                                                        serviceUserAuth.key_encryption_key.key,
                                                        serviceUserAuth.keystore_access_token);

  return api.createInviteFromKey(serviceUserAuth.vault_access_token,
                                 keypair.public_key,
                                 keypair.id)
    .then((invite: Invitation) => invite.token);
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
  console.log('finding items for ' + template.name);
  api.lookupItem(template.id, AuthData.vault_access_token)
    .then((existingItems: Item[]) => {
      if (existingItems.length > 0) {
        drawItems(existingItems);
      } else {
        console.log('no items');
      }
    });

  document.querySelector('#test-form input[type="submit"]').addEventListener('click', e => {
    e.preventDefault();

    api.createItem(template.name, collectSlotData('test-form'),
      AuthData.data_encryption_key.key, AuthData.vault_access_token)
      .then((item: Item) => {
        connection.then(async (c: Connection) => {
          const share = await api.shareItem(AuthData, c.own.id, item.id);
          console.log('share created');
          console.log(share);
        }).then(() => {
          api.getOutShares(AuthData.vault_access_token)
          .then(outShares => {
            m.mount(document.getElementById('user-shares-list'), OutgoingSharesMenuComponent(outShares));
          });

          api.getInShares(serviceUserAuth).then(drawSharedItems);
        });

        // TODO callback to notify receiver!
      });
  }); //end submit handler
}

// Entry point
window.onload = async () => {
  document.getElementById('test-form').hidden = true;

  m.mount(document.getElementById('auth'), LoginComponent);

  const realInvite = await makeInvite();
  // write the invite in a form attribute
  const adDiv = document.getElementById('ad-target');
  adDiv.attributes.getNamedItem('data-meeco-invite').value = realInvite;
  adDiv.append('invite: ' + realInvite);

  //Draw templates
  App.templates.templates.then((templates: ItemTemplate[]) => {
    m.mount(document.getElementById('templates-list'), TemplatesMenuComponent(templates));
  });

  let connection: Promise<Connection>;

  document.getElementById('ad-target').onclick = () => {

    if (!connection) {
      connection = makeConnection(realInvite);

      document.addEventListener('template-change', e => {
        makeAdHandler(connection, e['detail']);
      });

      // show form
      document.getElementById('test-form').hidden = false;

      makeFormTemplate('test-form')
      .then((template: ItemTemplate) => makeAdHandler(connection, template));
    } else {
      console.log('connection exists');
    }
  }

}
