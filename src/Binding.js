'use strict';

import { RefSlot, ArraySlot, BasicSlot } from './Slottable.js';

export function JSONSchemaToBinding(name, schemaObject) {
  let children = [];
  for(let k in schemaObject.properties) {
    let target = schemaObject.properties[k];
    if (target.type == 'object') {
      children.push(JSONSchemaToBinding(k, target));
    } else if (target.type == 'array') {
      children.push(new ArraySlot(k, target.description, target.type, target.items.type));
    } else if (target.$ref) {
      children.push(new RefSlot(k, target.$ref, 'reference'));
    } else {
      children.push(new BasicSlot(k, target.description, target.type));
    }
  }

  return new Binding(name,
                     (schemaObject.$id || name),
                     schemaObject.description,
                     children);
}


/**
 * Binds a JSONSchema given by schemaObject to an ItemTemplate specified by name.
 * Creates the ItemTemplate if needed.
 * @param {} name
 * @param {} label Used to resolve references by matching with schema.$id
 * @param {} description
 * @param {} children
 */
export default class Binding {

  constructor(name, label, description, children) {
    this.name = name;
    this.label = label;
    //TODO
    // Do not create an ItemTemplate or include this among the Slots of the parent Item.
    this.hidden = false;
    // Store any existing ItemTemplate data
    this.template = { id: 123 };

    // All properties of this object as Bindings or LeafBindings
    this.children = children;
  }

  slots() {
    return this.children.map(x => {
      return (x instanceof Binding) ? new RefSlot(x.name, 'pointer to object ' + x.name) : x;
    });
  }

  associated() {
    return this.children.filter(x => x instanceof Binding);
  }

  /** Generate POST data for /items_templates */
  asTemplateData () {
    return { label: this.name,
             name: this.name,
             description: this.description,
             slots_attributes: this.slots().map(x => x.asSlotData())
           };
  }

  /**
   * Call SDK services to create all needed Templates
   * Update in place with responses
   * @param saveTemplateCallback POST the new template and return it.
   */
  async pushTemplates(saveTemplateCallback) {
    this.template = await saveTemplateCallback(this.asTemplateData());

    this.associated().forEach(t => t.pushTemplates(saveTemplateCallback));
  };

  /** Record ItemTemplate and Slot ids against their JSON paths */
  toJSON() {
    let propMap = this.children.reduce((acc, x) => {
      acc[x.name] = x.toJSON();
      return acc;
    }, {});

    return {
      //label: this.name,
      name: this.name,
      type: 'item_template',
      // id: this.template.id,
      template_name: this.name,
      properties: propMap
    };
  };
}
