import {BaseService} from '@ucd-lib/cork-app-utils';
import DatabaseStore from '../stores/DatabaseStore.js';
import payload from '../payload.js';
import {config} from '../config.js'
import serviceUtils from './utils.js';

class DatabaseService extends BaseService {

  constructor() {
    super();
    this.store = DatabaseStore;
    this.basePath = `${serviceUtils.host}/api/db`;
    this.searchId = 0;
    this.aggsId = 0;
  }

  async get(org, db) {
    let ido = {org, db};
    let id = payload.getKey(ido);

    await this.checkRequesting(
      id, this.store.data.metadata,
      () => this.request({
          url: `${this.basePath}/${org}/${db}`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onMetadataUpdate(ido, {request}),
          onLoad: payload => this.store.onMetadataUpdate(ido, {payload: payload.body}),
          onError: error => this.store.onMetadataUpdate(ido, {error})
        })
    );

    return this.store.data.metadata.get(id);
  }

  async create(opts) {
    let db = opts.name;
    let org = opts.organization;
    let id = payload.getKey({org, db});

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
    let id = payload.getKey({org, db});

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

  async updateFeaturedList(org, db, opts={}) {
    const ido = {org, db, ...opts};
    let id = payload.getKey(ido);
    let url = `${this.basePath}/featured`;
    if ( opts.organizationList ) url += `/${org}`;

    await this.request({
      url,
      fetchOptions: {
        method : 'PATCH',
        body: ido,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUpdateFeaturedListUpdate(ido, {request}),
      onLoad: payload => {
        this.store.data.getFeaturedList.cache.clear();
        this.store.onUpdateFeaturedListUpdate(ido, {payload: payload.body})
      },
      onError: error => this.store.onUpdateFeaturedListUpdate(ido, {error})
    });

    return this.store.data.updateFeaturedList.get(id);
  }

  async getFeaturedList(org) {
    const ido = {org};
    let id = payload.getKey(ido);
    let url = `${this.basePath}/featured`;
    if ( org ) url += `/${org}`;

    await this.checkRequesting(
      id, this.store.data.getFeaturedList,
      () => this.request({
          url,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onGetFeaturedListUpdate(ido, {request}),
          onLoad: payload => this.store.onGetFeaturedListUpdate(ido, {payload: payload.body}),
          onError: error => this.store.onGetFeaturedListUpdate(ido, {error})
        })
    );

    return this.store.data.getFeaturedList.get(id);
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

  aggs(aggs, searchParams) {
    let id = this.aggsId++;

    let request = this.request({
      url: `${this.basePath}/aggregations`,
      fetchOptions: {
        method : 'POST',
        body: {...searchParams, aggs},
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onAggsUpdate({id, aggs, searchParams, request}),
      onLoad: payload => this.store.onAggsUpdate({id, aggs, searchParams, payload: payload.body}),
      onError: error => this.store.onAggsUpdate({id, aggs, searchParams, error})
    });

    return {
      id,
      request
    }
  }

  async getUsers(org, db) {
    let id = payload.getKey({org, db});

    await this.checkRequesting(
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

  async isAdmin(org, db){
    let id = payload.getKey({org, db});

    await this.checkRequesting(
      id, this.store.data.isAdmin,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/is-admin`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onIsAdminUpdate({org, db}, {request}),
          onLoad: payload => this.store.onIsAdminUpdate({org, db}, {payload: payload.body}),
          onError: error => this.store.onIsAdminUpdate({org, db}, {error})
        })
    );

    return this.store.data.isAdmin.get(id);
  }

  async getSchemas(org, db) {
    let id = payload.getKey({org, db});

    await this.checkRequesting(
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
    let id = payload.getKey({org, db, schema});

    await this.checkRequesting(
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
    let id = payload.getKey({org, db, schema, user});

    await this.checkRequesting(
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
    let id = payload.getKey({org, db, schema, table});

    await this.checkRequesting(
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

  async getTablesOverview(org, db) {
    let id = payload.getKey({org, db});
    await this.checkRequesting(
      id, this.store.data.tablesOverview,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/tables-overview`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onTablesOverviewUpdate({org, db}, {request}),
          onLoad: payload => this.store.onTablesOverviewUpdate({org, db}, {payload: payload.body}),
          onError: error => this.store.onTablesOverviewUpdate({org, db}, {error})
        })
    );
    return this.store.data.tablesOverview.get(id);
  }

  async getSchemasOverview(org, db) {
    let id = payload.getKey({org, db});
    await this.checkRequesting(
      id, this.store.data.schemasOverview,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/schemas-overview`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onSchemasOverviewUpdate({org, db}, {request}),
          onLoad: payload => this.store.onSchemasOverviewUpdate({org, db}, {payload: payload.body}),
          onError: error => this.store.onSchemasOverviewUpdate({org, db}, {error})
        })
    );
    return this.store.data.schemasOverview.get(id);
  }

  async getSchemaTablesOverview(org, db, schema) {
    let id = payload.getKey({org, db, schema});
    await this.checkRequesting(
      id, this.store.data.schemaTablesOverview,
      () => this.request({
          url: `${this.basePath}/${org}/${db}/schema/${schema}/tables-overview`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onSchemaTablesOverviewUpdate({org, db, schema}, {request}),
          onLoad: payload => this.store.onSchemaTablesOverviewUpdate({org, db, schema}, {payload: payload.body}),
          onError: error => this.store.onSchemaTablesOverviewUpdate({org, db, schema}, {error})
        })
    );
    return this.store.data.schemaTablesOverview.get(id);
  }

  async grantAccess(org, db, schemaTable, user, access) {
    let ido = {org, db, schemaTable, user, access, action: 'grantAccess'};
    let id = payload.getKey(ido);

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

  async bulkGrantAccess(org, db, grants) {
    let ido = {org, db, grants, action: 'bulkGrantAccess'};
    let id = payload.getKey(ido);

    await this.request({
      url: `${this.basePath}/${org}/${db}/grant`,
      fetchOptions: {
        method : 'POST',
        body: grants,
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
    let id = payload.getKey(ido);

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

  async bulkRevokeAccess(org, db, grants) {
    let ido = {org, db, grants, action: 'bulkRevokeAccess'};
    let id = payload.getKey(ido);
    await this.request({
      url: `${this.basePath}/${org}/${db}/revoke`,
      fetchOptions: {
        method : 'POST',
        body: grants,
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
    let id = payload.getKey(ido);

    await this.checkRequesting(
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
    let id = payload.getKey(ido);

    await this.checkRequesting(
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

  async link(local, remote, flags={}) {
    let ido = {
      org: local.org,
      db: local.db,
      action: 'link-'+remote.org+'/'+remote.db
    };
    let id = payload.getKey(ido);

    await this.request({
      url: `${this.basePath}/${local.org}/${local.db}/link/${remote.org}/${remote.db}`,
      fetchOptions: {
        method : 'POST',
        body: flags,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onLinkUpdate(ido, {request}),
      onLoad: payload => this.store.onLinkUpdate(ido, {payload: payload.body}),
      onError: error => this.store.onLinkUpdate(ido, {error})
    });

    return this.store.data.actions.get(id);
  }


}

const service = new DatabaseService();
export default service;
