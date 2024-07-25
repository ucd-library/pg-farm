import {BaseService} from '@ucd-lib/cork-app-utils';
import AdminStore from '../stores/AdminStore.js';

class AdminService extends BaseService {

  constructor() {
    super();
    this.store = AdminStore;
    this.basePath = '/api/admin';
  }

  async checkRequesting(id, cacheName, request) {
    let item = this.store.data[cacheName].get(id);
    
    if( item && item.state === this.store.STATE.LOADING ) {
      await item.request;
    } else {
      await request();
    }
  }

  async getDatabaseMetadata(org, db) {
    await this.checkRequesting(
      `${org}/${db}`, 'databaseMetadata',
      () => this.request({
          url: `${this.basePath}/database/${org}/${db}/metadata`,
          onLoading: request => this.store.onDatabaseMetadataLoading(org, db, request),
          onLoad: payload => this.store.onDatabaseMetadataLoaded(org, db, payload.body),
          onError: err => this.store.onDatabaseMetadataError(this.store, org, db, err)
        })
    );

    return this.store.data.databaseMetadata.get(`${org}/${db}`);
  }

  async getDatabaseUsers(org, db) {
    await this.checkRequesting(
      `${org}/${db}`, 'databaseUsers',
      () => this.request({
          url: `${this.basePath}/database/${org}/${db}/users`,
          onLoading: request => this.store.onDatabaseUsersLoading(org, db, request),
          onLoad: payload => this.store.onDatabaseUsersLoaded(org, db, payload.body),
          onError: err => this.store.onDatabaseUsersError(this.store, org, db, err)
        })
    );

    return this.store.data.databaseUsers.get(`${org}/${db}`);
  }

  async getDatabaseSchemas(org, db) {
    await this.checkRequesting(
      `${org}/${db}`, 'databaseSchemas',
      () => this.request({
        url: `${this.basePath}/database/${org}/${db}/schemas`,
        onLoading: request => this.store.onDatabaseSchemasLoading(org, db, request),
        onLoad: payload => this.store.onDatabaseSchemasLoaded(org, db, payload.body),
        onError: err => this.store.onDatabaseSchemasError(org, db, err)
      })
    );

    return this.store.data.databaseSchemas.get(`${org}/${db}`);
  }

  async getSchemaTables(org, db, schema) {
    await this.checkRequesting(
      `${org}/${db}/${schema}`, 'databaseSchemas',
      () => this.request({
        url: `${this.basePath}/database/${org}/${db}/schema/${schema}/tables`,
        onLoading: request => this.store.onSchemaTablesLoading(org, db, schema, request),
        onLoad: payload => this.store.onSchemaTablesLoaded(org, db, schema, payload.body),
        onError: err => this.store.onSchemaTablesError(org, db, schema, err)
      })
    );

    return this.store.data.schemaTables.get(`${org}/${db}/${schema}`);
  }

  async getTableAccess(org, db, schema, table) {
    await this.checkRequesting(
      `${org}/${db}/${schema}/${table}`, 'tableAccess',
      () => this.request({
        url: `${this.basePath}/database/${org}/${db}/schema/${schema}/table/${table}/access`,
        onLoading: request => this.store.onTableAccessLoading(org, db, schema, table, request),
        onLoad: payload => this.store.onTableAccessLoaded(org, db, schema, table, payload.body),
        onError: err => this.store.onTableAccessError(org, db, schema, table, err)
      })
    );

    return this.store.data.tableAccess.get(`${org}/${db}/${schema}/${table}`);
  }

  async getTableAccessByUser(org, db, schema, user) {
    await this.checkRequesting(
      `${org}/${db}/${schema}/${user}`, 'tableAccessByUser',
      () => this.request({
        url: `${this.basePath}/database/${org}/${db}/schema/${schema}/access/${user}`,
        onLoading: request => this.store.onTableAccessByUserLoading(org, db, schema, user, request),
        onLoad: payload => this.store.onTableAccessByUserLoaded(org, db, schema, user, payload.body),
        onError: err => this.store.onTableAccessByUserError(org, db, schema, user, err)
      })
    );

    return this.store.data.tableAccessByUser.get(`${org}/${db}/${schema}/${user}`);
  }

}

const service = new AdminService();
export default service;