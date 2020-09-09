"use strict";

import m from 'mithril';

export const ARRAY_NAME = 'json_array';

export default class TemplateSchemaStore {
  constructor(host, accessToken) {
    this.host = host;
    this.accessToken = accessToken;
    this.idSlotMap = [];
    this.nameTemplateMap = {};
    this.loadTemplates().then(d => {
      //verify arrayTemplate exists
      this.arrayTemplate();
      console.log(d);
    });
  }

  insertInSlotMap(slots) {
    slots.forEach(x => {
      this.idSlotMap[x.id] = x;
    });
  }

  derefTemplateSlots(template) {
    template.slots = template.slot_ids.map(y => this.idSlotMap[y]);
  }

  updateTemplateData(data) {
    this.insertInSlotMap(data.slots);

    data.item_templates.forEach(x => {
      this.nameTemplateMap[x.name] = x;
      this.derefTemplateSlots(x);
    });
  }

  loadTemplates() {
    return m.request({
      method: 'GET',
      url: this.host + '/item_templates',
      headers: { 'Authorization': 'Bearer ' + this.accessToken }
    }).then(data => this.updateTemplateData(data)); //needs to bind this
  }

  //get the unique template representing arrays
  arrayTemplate() {
    return this.saveUnlessExists({ name: ARRAY_NAME, label: 'array', slots_attributes: [] });
  }

  getTemplateByName(name) {
    return this.nameTemplateMap[name];
  }

  getTemplateById(id) {
    return this.templates.values.find(x => x.id == id);
  }

  getTemplateByReference(reference) {
    return this.templates.values.find(x => x.label == reference);
  }

  async saveUnlessExists(template) {
    if (!this.nameTemplateMap[template.name]) {
      return m.request({
        method: 'POST',
        url: this.host + '/item_templates',
        headers: { 'Authorization': 'Bearer ' + this.accessToken },
        body: template
      }).then(data => this.updateTemplateData())
        .then(() => this.getTemplateByName(template.name));
    } else {
      return this.getTemplateByName(template.name);
    }
  }
}
