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

  get(org) {
    return this.service.get(org);
  }

  getUsers(org) {
    return this.service.getUsers(org);
  }

  create(opts) {
    return this.service.create(opts);
  }

  update(org, opts) {
    return this.service.update(org, opts);
  }

  isAdmin(org) {
    return this.service.isAdmin(org);
  }

  getLogoUrl(org){
    return `${this.service.basePath}/${org}/logo`;
  }

}

const model = new OrganizationModel();
export default model;
