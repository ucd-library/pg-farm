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
   * @method getDatabaseMetadata
   * @description get base PG Farm database metadata
   * 
   * @param {String} org organization name or null
   * @param {String} db database name
   * @returns 
   */
  getDatabaseMetadata(org, db) {
    return this.service.getDatabaseMetadata(org, db);
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

  getDatabaseUsers(org, db) {
    return this.service.getDatabaseUsers(org, db);
  }

  getDatabaseSchemas(org, db) {
    return this.service.getDatabaseSchemas(org, db);
  }

  getDatabaseTables(org, db, schema) {
    return this.service.getDatabaseTables(org, db, schema);
  }

  getSchemaTables(org, db, schema) {
    return this.service.getSchemaTables(org, db, schema);
  }

  getTableAccessByUser(org, db, schema, user) {
    return this.service.getTableAccessByUser(org, db, schema, user);
  }

}

const model = new AdminModel();
export default model;