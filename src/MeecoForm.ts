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
      m('input', { ...this.props, disabled: this.checked }),
      m('input', { type: 'checkbox', checked: this.checked,
                   onchange: () => this.checked = !this.checked })
    ])
  }
}

export default function MeecoForm(formSpec: Record<string, object>) {
  // TODO add for/name/id to inputs
  const controls = Object.entries(formSpec).map(([label, props]) => m(ControlComponent, {label, props}));

  return {
    view: () => m('form.pure-form.pure-form-aligned', [
      m('h3', 'Meeco Form'),
      ...controls,
      m('.pure-controls', [
        m('label', 'Expires'),
        m('input', { type: 'date', /*value: (new Date()).toLocaleDateString()*/ }),
        m('button.pure-button', 'Share'),
        m('button.pure-button', 'Broadcast')
      ])
    ])
  };

}
