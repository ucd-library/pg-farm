import {BaseService} from '@ucd-lib/cork-app-utils';
import DatabaseStore from '../stores/DatabaseStore.js';
import serviceUtils from './utils.js';
import utils from '../utils.js';
import {config} from '../config.js'

class DatabaseService extends BaseService {

  constructor() {
    super();
    this.store = DatabaseStore;
    this.basePath = `${config.host}/api/db`;
    this.searchId = 0;
  }

  async get(org, db) {
    let id = utils.getIdPath({org, db});

    await serviceUtils.checkRequesting(
      id, this.store.data.metadata,
      () => this.request({
          url: `${this.basePath}/${org}/${db}`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onMetadataUpdate({org, db}, {request}),
          onLoad: payload => this.store.onMetadataUpdate({org, db}, {payload: payload.body}),
          onError: error => this.store.onMetadataUpdate({org, db}, {error})
        })
    );

    return this.store.data.metadata.get(id);
  }

  async create(opts) {
    let db = opts.name;
    let org = opts.organization;
    let id = utils.getIdPath({org, db});

    await this.request({
      url: this.basePath,
      fetchOptions: {
        method : 'POST',
        body: opts,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onCreateUpdate({org, db}, {request}),
      onLoad: payload => this.store.onCreateUpdate({org, db}, {payload: payload.body}),
      onError: error => this.store.onCreateUpdate({org, db}, {error})
    });

    return this.store.data.create.get(id);
  }

  async update(org, db, opts) {
    let id = utils.getIdPath({org, db});

    await this.request({
      url: `${this.basePath}/${org}/${db}`,
      fetchOptions: {
        method : 'PATCH',
        body: opts,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUpdateUpdate({org, db}, {request}),
      onLoad: payload => this.store.onUpdateUpdate({org, db}, {payload: payload.body}),
      onError: error => this.store.onUpdateUpdate({org,db}, {error})
    });

    return this.store.data.update.get(id);
  }

  search(searchParams) {
    let id = this.searchId++;

    let request = this.request({
      url: `${this.basePath}/search`,
      fetchOptions: {
        method : 'POST',
        body: searchParams,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onSearchUpdate({id, searchParams, request}),
      onLoad: payload => this.store.onSearchUpdate({id, searchParams, payload: payload.body}),
      onError: error => this.store.onSearchUpdate({id, searchParams, error})
    });

    return {
      id,
      request
    }
  }

  async getUsers(org, db) {
    let id = utils.getIdPath({org, db});

    await serviceUtils.checkRequesting(
      id, this.store.data.users,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/users`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onGetUsersUpdate({org, db}, {request}),
          onLoad: payload => this.store.onGetUsersUpdate({org, db}, {payload: payload.body}),
          onError: error => this.store.onGetUsersUpdate({org, db}, {error})
        })
    );

    return this.store.data.users.get(id);
  }

  async getSchemas(org, db) {
    let id = utils.getIdPath({org, db});

    await serviceUtils.checkRequesting(
      id, this.store.data.schemas,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/schemas`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onGetSchemasUpdate({org, db}, {request}),
          onLoad: payload => this.store.onGetSchemasUpdate({org, db}, {payload: payload.body}),
          onError: error => this.store.onGetSchemasUpdate({org, db}, {error})
        })
    );

    return this.store.data.schemas.get(id);
  }

  async getSchemaTables(org, db, schema) {
    let id = utils.getIdPath({org, db, schema});

    await serviceUtils.checkRequesting(
      id, this.store.data.schemaTables,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/schema/${schema}/tables`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onGetSchemasUpdate({org, db, schema}, {request}),
          onLoad: payload => this.store.onGetSchemasUpdate({org, db, schema}, {payload: payload.body}),
          onError: error => this.store.onGetSchemasUpdate({org, db, schema}, {error})
        })
    );

    return this.store.data.schemas.get(id);
  }

  async getSchemaUserAccess(org, db, schema, user) {
    let id = utils.getIdPath({org, db, schema, user});

    await serviceUtils.checkRequesting(
      id, this.store.data.schemaUserAccess,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/schema/${schema}/access/${user}`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onGetSchemaUserAccessUpdate({org, db, schema, user}, {request}),
          onLoad: payload => this.store.onGetSchemaUserAccessUpdate({org, db, schema, user}, {payload: payload.body}),
          onError: error => this.store.onGetSchemaUserAccessUpdate({org, db, schema, user}, {error})
        })
    );

    return this.store.data.schemaUserAccess.get(id);
  }


  async getSchemaTableAccess(org, db, schema, table) {
    let id = utils.getIdPath({org, db, schema, table});

    await serviceUtils.checkRequesting(
      id, this.store.data.schemaTableAccess,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/schema/${schema}/table/${table}/access`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onGetSchemaTableAccessUpdate({org, db, schema, table}, {request}),
          onLoad: payload => this.store.onGetSchemaTableAccessUpdate({org, db, schema, table}, {payload: payload.body}),
          onError: error => this.store.onGetSchemaTableAccessUpdate({org, db, schema, table}, {error})
        })
    );

    return this.store.data.schemaTableAccess.get(id);
  }

  async grantAccess(org, db, schemaTable, user, access) {
    let ido = {org, db, schemaTable, user, access, action: 'grantAccess'};
    let id = utils.getIdPath(ido);

    await this.request({
      url: `${this.basePath}/${org}/${db}/grant/${schemaTable}/${user}/${access}`,
      fetchOptions: {
        method : 'PUT',
        body: {schemaTable, user, access},
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onGrantAccessUpdate(ido, {request}),
      onLoad: payload => this.store.onGrantAccessUpdate(ido, {payload: payload.body}),
      onError: error => this.store.onGrantAccessUpdate(ido, {error})
    });

    return this.store.data.actions.get(id);
  }

  async revokeAccess(org, db, schemaTable, user, access) {
    let ido = {org, db, schemaTable, user, access, action: 'revokeAccess'};
    let id = utils.getIdPath(ido);

    await this.request({
      url: `${this.basePath}/${org}/${db}/revoke/${schemaTable}/${user}/${access}`,
      fetchOptions: {
        method : 'DELETE',
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onRevokeAccessUpdate(ido, {request}),
      onLoad: payload => this.store.onRevokeAccessUpdate(ido, {payload: payload.body}),
      onError: error => this.store.onRevokeAccessUpdate(ido, {error})
    });

    return this.store.data.actions.get(id);
  }

  async restartApi(org, db) {
    let ido = {org, db, action: 'restartApi'};
    let id = utils.getIdPath(ido);

    await serviceUtils.checkRequesting(
      id, this.store.data.actions,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/restart/api`,
          fetchOptions: {
            method : 'POST',
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onRestartApiUpdate(ido, {request}),
          onLoad: payload => this.store.onRestartApiUpdate(ido, {payload: payload.body}),
          onError: error => this.store.onRestartApiUpdate(ido, {error})
        })
    );

    return this.store.data.actions.get(id);
  }

  async init(org, db) {
    let ido = {org, db, action: 'init'};
    let id = utils.getIdPath(ido);

    await serviceUtils.checkRequesting(
      id, this.store.data.actions,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/init`,
          fetchOptions: {
            method : 'POST',
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onInitUpdate(ido, {request}),
          onLoad: payload => this.store.onInitUpdate(ido, {payload: payload.body}),
          onError: error => this.store.onInitUpdate(ido, {error})
        })
    );

    return this.store.data.actions.get(id);
  }


}

const service = new DatabaseService();
export default service;