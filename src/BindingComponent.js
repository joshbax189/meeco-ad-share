"use strict";

import m from 'mithril';

import Binding from './Binding.js';
import { Slottable } from './Slottable.js';

let mapControlC = {
  view: () => m('span', [
    m('button', 'Hide'),
  ])
};

export default function BindingComponent(binding) {
  if (binding instanceof Binding) {
    let inner = binding.children.map(x => m(BindingComponent(x)));
    return {
      view: () =>
      m('.node', [
        m('input', {type: 'text', value: binding.name}),
        ': ',
        m('.obj', inner),
        m(mapControlC),
      ])
    };
  } else if (binding instanceof Slottable) {
    return {
      view: () => m('.node', [
        m('input', {type: 'text', value: binding.name}),
        ': ',
        m('.leaf', binding.schemaType),
        m(mapControlC),
      ])
    };
  }
}
