import {BaseModel} from '@ucd-lib/cork-app-utils';
import DatabaseService from '../services/DatabaseService.js';
import DatabaseStore from '../stores/DatabaseStore.js';

class DatabaseModel extends BaseModel {

  constructor() {
    super();

    this.store = DatabaseStore;
    this.service = DatabaseService;

    this.register('DatabaseModel');
  }

  /**
   * @method getDatabaseMetadata
   * @description get base PG Farm database metadata
   *
   * @param {String} org organization name or null
   * @param {String} db database name
   * @returns
   */
  get(org, db) {
    return this.service.get(org, db);
  }

  /**
   * @method create
   *
   * @param {Object} opts
   * @param {String} opts.instance instance name
   **/
  async create(opts) {
    if( opts.instance && !opts.instance.match(/^inst-/) ) {
      opts.instance = 'inst-'+opts.instance;
    }

    return this.service.create(opts);
  }

  async update(org, db, opts) {
    return this.service.update(org, db, opts);
  }

  async addToFeaturedList(org, db, opts={}) {
    opts.action = 'add';
    return this.service.updateFeaturedList(org, db, opts);
  }

  async removeFromFeaturedList(org, db, organizationList) {
    return this.service.updateFeaturedList(org, db, {
      action: 'remove',
      organizationList
    });
  }

  async getFeaturedList(org) {
    return this.service.getFeaturedList(org);
  }

  /**
   * @method search
   * @descsription search for databases.  Returns object with id and request promise.
   * When the request promise resolves, use getSearchResult(id) to get the result.  The
   * id is provided in the returned object.
   *
   * @param {Object} opts
   *
   * @returns {Object}
   **/
  search(opts) {
    return this.service.search(opts);
  }

  /**
   * @method getSearchResult
   * @description get search result by id retuned from search
   *
   * @param {String} id
   * @returns {Object}
   */
  getSearchResult(id) {
    return this.store.data.search.get(id);
  }

  aggs(aggs, opts) {
    return this.service.aggs(aggs, opts);
  }

  getAggResult(id) {
    return this.store.data.aggs.get(id);
  }

  /**
   * @method getUsers
   * @description get list of users for a database
   *
   * @param {*} org
   * @param {*} db
   * @returns
   */
  getUsers(org, db) {
    return this.service.getUsers(org, db);
  }

  getSchemas(org, db) {
    return this.service.getSchemas(org, db);
  }

  getSchemaTables(org, db, schema) {
    return this.service.getSchemaTables(org, db, schema);
  }

  getSchemaUserAccess(org, db, schema, user) {
    return this.service.getSchemaUserAccess(org, db, schema, user);
  }

  getSchemaTableAccess(org, db, schema, table) {
    return this.service.getSchemaTableAccess(org, db, schema, table);
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
  async setSchemaUserAccess(org, db, schemaTable='_', user, access) {
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

  restartApi(org, db) {
    return this.service.restartApi(org, db);
  }

  init(org, db) {
    return this.service.init(org, db);
  }

  link(local, remote, opts) {
    return this.service.link(local, remote, opts);
  }

}

const model = new DatabaseModel();
export default model;
