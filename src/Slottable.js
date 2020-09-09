'use strict';

import { ARRAY_NAME } from './TemplateSchemaStore.js';

/**
 * Create a Slot in an ItemTemplate.
 * @param {} name The Slot name
 * @param {} description Slot description
 * @param {} schemaType Incoming type, saved in the Slot.description field.
 */
export class Slottable {
  constructor(name, description, schemaType) {
    this.name = name;
    this.description = description;
    this.schemaType = schemaType;
  }

  /** Meant to be used in the slots_attributes list */
  asSlotData() {
    return {
      name: this.name,
      label: this.description || this.name,
      slot_type_name: 'key_value',
      description: serializeType(this.schemaType)
    };
  }
}

export class BasicSlot extends Slottable {
  toJSON() {
    return {
      name: this.name,
      type: 'slot',
      schema_type: this.schemaType
    };
  }
}

/**
 * This may be either a reference to a child object or an external
 * schema.
 */
export class RefSlot extends Slottable {
  constructor(name, description) {
    super(name, description, 'reference');
  }

  toJSON() {
   return {
     name: this.name,
     template_name: '',
     description: this.description,
     type: 'item_template'
   };
  }
}

export class ArraySlot extends Slottable {
  constructor(name, description, schemaType, itemsType) {
    super(name, description, schemaType);
    this.itemsType = itemsType;
  }
  toJSON() {
    return {
      name: this.name,
      template_name: ARRAY_NAME,
      type: 'item_template',
      items: {
        slot_type: this.itemsType
      }
    };
  }
}

/**
 * Format type information for storing in Slot.description property
 */
function serializeType(typeString) {
  return 'type:' + typeString;
}
