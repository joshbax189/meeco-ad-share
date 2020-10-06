import * as m from 'mithril';
import { Slot } from '@meeco/vault-api-sdk';

class ControlComponent {
  private slot: Slot;

  constructor(vnode) {
    this.slot = vnode.attrs.slot;
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
          return m('select.meeco-slot', { name: this.slot.name });
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

export default function MeecoForm(formSlots: Slot[],
  id?: string,
  templateName?: string,
  templateLabel?: string
) {
  const idTag = id ? '#' + id : '';
  const hidden = ['Category', 'Image', 'Custom Image'];

  // TODO add for/name/id to inputs
  return {
    view: () =>
      m('form' + idTag + '.pure-form.pure-form-aligned',
        templateName ? { 'data-meeco-template-name': templateName } : null, [
        m('h3', templateLabel || 'Meeco Form'),
        formSlots.map((slot: Slot) => !hidden.includes(slot.label) ? m(ControlComponent, { slot }) : null),
        m('.pure-controls', [
          m('label', 'Expires'),
          m('input', { type: 'date', /*value: (new Date()).toLocaleDateString()*/ }),
          m('input.pure-button', { type: 'submit', value: 'Share' }),
          m('button.pure-button', 'Broadcast')
        ])
      ])
  };

}
