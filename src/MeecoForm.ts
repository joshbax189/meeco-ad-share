import * as m from 'mithril';

class ControlComponent {
  private label: string;
  private props: object;

  constructor(vnode) {
    this.label = vnode.attrs.label;
    this.props = vnode.attrs.props;
  }

  view() {
    return m('.pure-control-group', [
      m('label', this.label),
      m('input.meeco-slot', { ...this.props }),
    ])
  }
}

export default function MeecoForm(formSpec: Record<string, object>,
  id?: string,
  templateName?: string,
  templateLabel?: string
) {
  const idTag = id ? '#' + id : '';
  // TODO add for/name/id to inputs
  return {
    view: () => m('form' + idTag + '.pure-form.pure-form-aligned',
      templateName ? { 'data-meeco-template-name': templateName } : null, [
      m('h3', templateLabel || 'Meeco Form'),
      Object.entries(formSpec).map(([label, props]) => m(ControlComponent, { label, props })),
      m('.pure-controls', [
        m('label', 'Expires'),
        m('input', { type: 'date', /*value: (new Date()).toLocaleDateString()*/ }),
        m('input.pure-button', { type: 'submit', value: 'Share' }),
        m('button.pure-button', 'Broadcast')
      ])
    ])
  };

}
