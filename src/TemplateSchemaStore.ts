import * as m from 'mithril';
import { Slot, ClassificationNode } from '@meeco/vault-api-sdk';

export const ARRAY_NAME = 'json_array';

export interface ItemTemplate {
  name: string,
  id: string,
  label: string,
  slot_ids: Array<string>,
  slots: Array<Slot>
}

export interface ItemTemplateData {
  name: string,
  label: string,
  slots_attributes: Array<any>,
}

export class TemplateSchemaStore {
  private idSlotMap: Record<string, Slot>;
  private idClassificationMap: Record<string, any>;
  private schemeClassificationMap: Record<string, any[]>;
  private nameTemplateMap: Record<string, ItemTemplate>;
  private classifications: any[];

  public templates: Promise<ItemTemplate[]>;

  constructor(private host: string, private accessToken: string, private apiKey?: string) {
    this.host = host;
    this.accessToken = accessToken;
    this.idSlotMap = {};
    this.idClassificationMap = {};
    this.schemeClassificationMap = {};
    this.nameTemplateMap = {};
    this.apiKey = apiKey;
    this.templates = this.loadTemplates().then(() => {
      //verify arrayTemplate exists
      this.arrayTemplate();
      console.log('templates loaded');
      return this._templates();
    });
    this.loadClassifications();
  }

  private insertInIdMap(data: Array<any>, map: Record<string, any>): void {
    data.forEach(x => {
      map[x.id] = x;
    });
  }

  private derefTemplateSlots(template: ItemTemplate): void {
    template.slots = template.slot_ids.map(y => this.idSlotMap[y]);
  }

  private updateTemplateData(data: any): void {
    this.insertInIdMap(data.slots, this.idSlotMap);

    // Deal with single item respones...
    (data.item_templates || [data.item_template]).forEach((x: any) => {
      this.nameTemplateMap[x.name] = x;
      this.derefTemplateSlots(x);
    });
  }

  private updateClassificationNodes(data: any): void {
    const nodes = data.classification_nodes || [data.classification_node];
    this.insertInIdMap(nodes, this.idClassificationMap);
    this.classifications = Object.values(this.idClassificationMap);
    this.classifications.forEach(x => {
      let res = this.schemeClassificationMap[x.scheme] || [];
      res.push(x);
      this.schemeClassificationMap[x.scheme] = res;
    });
  }

  async loadTemplates(): Promise<void> {
    return m.request({
      method: 'GET',
      url: this.host + '/item_templates',
      headers: {
        'Authorization': 'Bearer ' + this.accessToken,
        'Meeco-Subscription-Key': this.apiKey
      }
    }).then(data => this.updateTemplateData(data)); //needs to bind this
  }

  async loadClassifications() {
    return m.request({
      method: 'GET',
      url: this.host + '/classification_nodes',
      headers: {
        'Authorization': 'Bearer ' + this.accessToken,
        'Meeco-Subscription-Key': this.apiKey
      }
    }).then(data => this.updateClassificationNodes(data));
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

  getClassificationsByScheme(scheme: string): ClassificationNode[] {
    return this.schemeClassificationMap[scheme] || [];
  }

  private _templates(): ItemTemplate[] {
    return Object.values(this.nameTemplateMap);
  }

  async saveUnlessExists(template: ItemTemplateData) {
    if (!this.nameTemplateMap[template.name]) {
      return m.request({
        method: 'POST',
        url: this.host + '/item_templates',
        headers: {
          'Authorization': 'Bearer ' + this.accessToken,
          'Meeco-Subscription-Key': this.apiKey
        },
        body: template
      }).then(data => this.updateTemplateData(data))
        .then(() => this.getTemplateByName(template.name));
    } else {
      return this.getTemplateByName(template.name);
    }
  }

  async saveTag(name: string, label: string, description?: string) {
    const existing = (this.schemeClassificationMap['tag'] || []).find(x => x.label === label);

    if (!existing) {
      const newTag = {
        classification_node: {
          classification_scheme_name: 'tag',
          name,
          label,
          description,
        }
      };

      return m.request({
        method: 'POST',
        url: this.host + '/classification_nodes',
        headers: {
          'Authorization': 'Bearer ' + this.accessToken,
          'Meeco-Subscription-Key': this.apiKey
        },
        body: newTag
      }).then(data => {
        this.updateClassificationNodes(data);
        return (data as any).classification_node;
      });
    } else {
      return existing;
    }

  }
}
