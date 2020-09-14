import * as m from 'mithril';

export const ARRAY_NAME = 'json_array';

export interface ItemTemplate {
  name: string,
  id: string,
  label: string,
  slot_ids: Array<string>,
  slots: Array<any>
}

export interface ItemTemplateData {
  name: string,
  label: string,
  slots_attributes: Array<any>,
}

export class TemplateSchemaStore {
  private idSlotMap: Record<string, any>;
  private nameTemplateMap: Record<string, ItemTemplate>;

  constructor(private host: string, private accessToken: string, private apiKey?: string) {
    this.host = host;
    this.accessToken = accessToken;
    this.idSlotMap = {};
    this.nameTemplateMap = {};
    this.apiKey = apiKey;
    this.loadTemplates().then(() => {
      //verify arrayTemplate exists
      this.arrayTemplate();
      console.log('templates loaded');
    });
  }

  private insertInSlotMap(slots: Array<any>): void {
    slots.forEach(x => {
      this.idSlotMap[x.id] = x;
    });
  }

  private derefTemplateSlots(template: ItemTemplate): void {
    template.slots = template.slot_ids.map(y => this.idSlotMap[y]);
  }

  private updateTemplateData(data: any): void {
    this.insertInSlotMap(data.slots);

    data.item_templates.forEach((x: any) => {
      this.nameTemplateMap[x.name] = x;
      this.derefTemplateSlots(x);
    });
  }

  async loadTemplates(): Promise<void> {
    return m.request({
      method: 'GET',
      url: this.host + '/item_templates',
      headers: { 'Authorization': 'Bearer ' + this.accessToken,
                 'Meeco-Subscription-Key': this.apiKey }
    }).then(data => this.updateTemplateData(data)); //needs to bind this
  }

  //get the unique template representing arrays
  arrayTemplate() {
    return this.saveUnlessExists({ name: ARRAY_NAME, label: 'array', slots_attributes: [] });
  }

  getTemplateByName(name: string): ItemTemplate {
    return this.nameTemplateMap[name];
  }

  getTemplateById(id: string): ItemTemplate {
    return Object.values(this.nameTemplateMap).find(x => x.id == id);
  }

  getTemplateByReference(reference: string): ItemTemplate {
    return Object.values(this.nameTemplateMap).find(x => x.label == reference);
  }

  templates(): ItemTemplate[] {
    return Object.values(this.nameTemplateMap);
  }

  async saveUnlessExists(template: ItemTemplateData) {
    if (!this.nameTemplateMap[template.name]) {
      return m.request({
        method: 'POST',
        url: this.host + '/item_templates',
        headers: { 'Authorization': 'Bearer ' + this.accessToken,
                 'Meeco-Subscription-Key': this.apiKey },
        body: template
      }).then(data => this.updateTemplateData(data))
        .then(() => this.getTemplateByName(template.name));
    } else {
      return this.getTemplateByName(template.name);
    }
  }
}
