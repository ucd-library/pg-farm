import {BaseModel} from '@ucd-lib/cork-app-utils';
import AdminService from '../services/AdminService.js';
import AdminStore from '../stores/AdminStore.js';

class AdminModel extends BaseModel {

  constructor() {
    super();

    this.store = AdminStore;
    this.service = AdminService;
      
    this.register('AdminModel');
  }

  getDatabaseMetadata(org, db) {
    return this.service.getDatabaseMetadata(org, db);
  }

}

const model = new AdminModel();
export default model;