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

  getTableAccess(org, db, schema, table) {
    return this.service.getTableAccess(org, db, schema, table);
  }

  /**
   * @method setUserAccess
   * @description set access for a user on a database, schema or table.
   * For a database, schemaTable should be null.  For a table, the schemaTable
   * should be [schema].[table].  Otherwise just provide the [schema] name.
   * 
   * @param {String} org organization name or id
   * @param {String} db database name or id
   * @param {String|Null} schemaTable Either the [schema] name, [schema].[table] name or null for database
   * @param {String} user database user name
   * @param {String} access Either 'READ', 'WRITE' or 'NONE'.  NONE will revoke all access.
   */
  async setUserAccess(org, db, schemaTable='_', user, access) {
    let responses = [];
    if( access == 'READ' ) {
      responses.push(await this.revokeAccess(org, db, schemaTable, user, 'WRITE'));
      responses.push(await this.grantAccess(org, db, schemaTable, user, 'READ'));
    } else if( access == 'WRITE' ) {
      responses.push(await this.grantAccess(org, db, schemaTable, user, 'WRITE'));
    } else if( access == 'NONE' ) {
      responses.push(await this.revokeAccess(org, db, schemaTable, user, 'READ'));
    } else {
      throw new Error('Invalid access type: '+access);
    }

    return responses;
  }

  grantAccess(org, db, schemaTable, user, access) {
    return this.service.grantAccess(org, db, schemaTable, user, access);
  }

  revokeAccess(org, db, schemaTable, user, access) {
    return this.service.revokeAccess(org, db, schemaTable, user, access);
  }

}

const model = new AdminModel();
export default model;