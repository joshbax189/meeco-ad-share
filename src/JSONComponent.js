'use strict';

import m from 'mithril';

/**
 * A Mithril Component for pretty-printing JSON.
 */
export default function JSONComponent(obj) {
  if (obj && typeof obj == 'object') {
    let inner = Object.entries(obj).map(([key, value]) => m('.node', [
      m('span', key),
      ': ',
      m(JSONComponent(value)),
      ','
    ]));

    let open = '{';
    let close = '}';
    if (obj instanceof Array) {
      open = '[';
      close = ']';
    }

    return {
      view: () => [open, m('.obj', inner), close]
    };
  } else {
    return {
      view: () => m('span', (obj != undefined) ? obj.toString() : 'undefined')
    };
  }
}
