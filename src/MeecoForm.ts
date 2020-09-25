import * as m from 'mithril';

class ControlComponent {
  public checked: boolean;
  private label: string;
  private props: object;

  constructor(vnode) {
    this.checked = false;
    this.label = vnode.attrs.label;
    this.props = vnode.attrs.props;
  }

  view() {
    return m('.pure-control-group', [
      m('label', this.label),
      m('input.meeco-slot', { ...this.props, disabled: this.checked }),
      m('input', { type: 'checkbox', checked: this.checked,
                   onchange: () => this.checked = !this.checked })
    ])
  }
}

export default function MeecoForm(formSpec: Record<string, object>,
                                  id?: string,
                                  templateName?: string) {
  const idTag = id ? '#' + id : '';
  // TODO add for/name/id to inputs
  return {
    view: () => m('form' + idTag + '.pure-form.pure-form-aligned',
                  templateName ? {'data-meeco-template-name': templateName} : null, [
      m('h3', 'Meeco Form'),
      Object.entries(formSpec).map(([label, props]) => m(ControlComponent, {label, props})),
      m('.pure-controls', [
        m('label', 'Expires'),
        m('input', { type: 'date', /*value: (new Date()).toLocaleDateString()*/ }),
        m('input.pure-button', {type: 'submit', value: 'Share'}),
        m('button.pure-button', 'Broadcast')
      ])
    ])
  };

}
