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


  /**
   * @method startInstance
   * @description start a PG Farm database instance
   * 
   * @param {String} org organization name or null
   * @param {String} db database name
   * @returns 
   */
  startInstance(org, db) {
    return this.service.startInstance(org, db);
  }

}

const model = new AdminModel();
export default model;