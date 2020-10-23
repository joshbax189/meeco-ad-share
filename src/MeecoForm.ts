import { Slot, ClassificationNode } from '@meeco/vault-api-sdk';
import * as m from 'mithril';
import { ItemTemplate, TemplateSchemaStore } from './TemplateSchemaStore';

class ControlComponent {
  private slot: Slot;
  private store: TemplateSchemaStore;

  constructor(vnode) {
    this.slot = vnode.attrs.slot;
    this.store = vnode.attrs.store;
  }

  toInput() {
    switch (this.slot.slot_type_name) {
      case 'key_value':
        return m('input.meeco-slot', { type: 'text', name: this.slot.name });
      case 'bool':
        return m('input.meeco-slot', { type: 'checkbox', name: this.slot.name });
      case 'date':
      case 'datetime':
        return m('input.meeco-slot', { type: 'date', name: this.slot.name });
      case 'password':
        return m('input.meeco-slot', { type: 'password', name: this.slot.name });
      case 'phone_number':
        return m('input.meeco-slot', { type: 'number', name: this.slot.name });
      case 'classification_node':
        // Note that config is not included in the Slot type
        let slotConfig = (this.slot as any).config;
        let special = false;
        // attempt to parse hacked slot
        if (!slotConfig && this.slot.description) {
          try {
            slotConfig = JSON.parse(this.slot.description);
            special = true;
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.log('missing config object on class_node slot');
            } else {
              throw e;
            }
          }
        }

        // default select menu
        if (slotConfig.type == 'select') {
          let options = this.store.getClassificationsByScheme(slotConfig.classification_scheme_name);
          if (special) {
            options = options.filter(o => o.name.startsWith(slotConfig.special_prefix));
          }
          return m('select.meeco-slot',
                   { name: this.slot.name, disabled: options.length == 0 },
                   options.map((cn: ClassificationNode) => m('option', cn.label)));
          // special case for tags
        } else if (slotConfig.selection_type == 'multiple') {
          let options = this.store.getClassificationsByScheme(slotConfig.classification_scheme_name);
          return m('select.meeco-slot',
                   { name: this.slot.name, multiple: true, disabled: options.length == 0 },
                   options.map((cn: ClassificationNode) => m('option', cn.label)));
        }
      default:
        return m('input.meeco-slot', { type: 'text', name: this.slot.name });
    }
  }

  view() {
    return m('.pure-control-group', [
      m('label', this.slot.label),
      this.toInput(),
    ])
  }
}

export default function MeecoForm(template: ItemTemplate,
  store: TemplateSchemaStore,
  domId?: string
) {
  const idTag = domId ? '#' + domId : '';
  const hidden = ['Image', 'Custom Image'];

  // TODO add for/name/id to inputs
  return {
    view: () =>
      m('form' + idTag + '.pure-form.pure-form-aligned',
        template.name ? { 'data-meeco-template-name': template.name } : null, [
        m('h3', template.label || 'Meeco Form'),
        template.slots.map((slot: Slot) => !hidden.includes(slot.label) ? m(ControlComponent, { slot, store }) : null),
        m('.pure-controls', [
          m('label', 'Expires'),
          m('input', { type: 'date', /*value: (new Date()).toLocaleDateString()*/ }),
          m('input.pure-button', { type: 'submit', value: 'Share' }),
          m('button.pure-button', 'Broadcast')
        ])
      ])
  };

}
