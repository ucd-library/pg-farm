import {BaseModel} from '@ucd-lib/cork-app-utils';
import OrganizationService from '../services/OrganizationService.js';
import OrganizationStore from '../stores/OrganizationStore.js';

class OrganizationModel extends BaseModel {

  constructor() {
    super();

    this.store = OrganizationStore;
    this.service = OrganizationService;
      
    this.register('OrganizationModel');
  }

  create(opts) {
    return this.service.create(opts);
  }

  update(org, opts) {
    return this.service.update(org, opts);
  }

  addUser(org, user, role) {
    instance = this.formatName(instance);
    return this.service.addUser(org, user, role);
  }

}

const model = new OrganizationModel();
export default model;