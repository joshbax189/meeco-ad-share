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
        if ((this.slot as any).config.type == 'select') {
          let options = this.store.getClassificationsByScheme((this.slot as any).config.classification_scheme_name);
          return m('select.meeco-slot', { name: this.slot.name }, options.map((cn: ClassificationNode) => m('option', cn.label)));
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
  const hidden = ['Category', 'Image', 'Custom Image'];

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
