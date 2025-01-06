import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';
import payloadUtils from '../payload.js';

class DatabaseStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      metadata : new LruStore({name: 'database.metadata'}),
      create : new LruStore({name: 'database.create'}),
      update : new LruStore({name: 'database.update'}),
      users : new LruStore({name: 'database.users'}),
      search : new LruStore({name: 'database.search', max: 20}),
      schemas : new LruStore({name: 'database.schemas'}),
      schemaTables : new LruStore({name: 'database.schemaTables'}),
      schemaUserAccess : new LruStore({name: 'database.schemaUserAccess'}),
      schemaTableAccess : new LruStore({name: 'database.schemaTableAccess'}),
      actions : new LruStore({name: 'database.actions'}),
      updateFeaturedList : new LruStore({name: 'database.updateFeaturedList'}),
      getFeaturedList : new LruStore({name: 'database.getFeaturedList'})
    };

    this.events = {
      DATABASE_METADATA_UPDATE : 'database-metadata-update',
      DATABASE_CREATE_UPDATE : 'database-create-update',
      DATABASE_UPDATE_UPDATE : 'database-update-update',
      DATABASE_USERS_UPDATE : 'database-users-update',
      DATABASE_SEARCH_UPDATE : 'database-search-update',
      DATABASE_SCHEMAS_UPDATE : 'database-schemas-update',
      DATABASE_SCHEMA_TABLES_UPDATE : 'database-schema-tables-update',
      DATABASE_SCHEMA_USER_ACCESS_UPDATE : 'database-schema-user-access-update',
      DATABASE_SCHEMA_TABLE_ACCESS_UPDATE : 'database-schema-table-access-update',
      DATABASE_GRANT_ACCESS_UPDATE : 'database-grant-access-update',
      DATABASE_REVOKE_ACCESS_UPDATE : 'database-revoke-access-update',
      DATABASE_RESTART_API_UPDATE : 'database-restart-api-update',
      DATABASE_INIT_UPDATE : 'database-init-update',
      DATABASE_LINK_UPDATE : 'database-link-update',
      DATABASE_UPDATE_FEATURED_LIST_UPDATE : 'database-update-featured-list-update',
      DATABASE_GET_FEATURED_LIST_UPDATE : 'database-get-featured-list-update'
    };
  }

  onMetadataUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.metadata,
      this.events.DATABASE_METADATA_UPDATE
    );
  }

  onCreateUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.create,
      this.events.DATABASE_CREATE_UPDATE
    );
  }

  onUpdateUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.update,
      this.events.DATABASE_UPDATE_UPDATE
    );
  }

  onSearchUpdate(payload) {
    this._set(
      payload,
      this.data.search,
      this.events.DATABASE_SEARCH_UPDATE
    );
  }

  onGetUsersUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.users,
      this.events.DATABASE_USERS_UPDATE
    );
  }

  onGetSchemasUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.schemas,
      this.events.DATABASE_SCHEMAS_UPDATE
    );
  }

  onGetSchemaTablesUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.schemaTables,
      this.events.DATABASE_SCHEMA_TABLES_UPDATE
    );
  }

  onGetSchemaUserAccessUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.schemaUserAccess,
      this.events.DATABASE_SCHEMA_USER_ACCESS_UPDATE
    );
  }

  onGetSchemaTableAccessUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.schemaTableAccess,
      this.events.DATABASE_SCHEMA_TABLE_ACCESS_UPDATE
    );
  }

  onGrantAccessUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.DATABASE_GRANT_ACCESS_UPDATE
    );
  }

  onRevokeAccessUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.DATABASE_REVOKE_ACCESS_UPDATE
    );
  }

  onRestartApiUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.DATABASE_RESTART_API_UPDATE
    );
  }

  onInitUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.DATABASE_INIT_UPDATE
    );
  }

  onLinkUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.DATABASE_LINK_UPDATE
    );
  }

  onUpdateFeaturedListUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.updateFeaturedList,
      this.events.DATABASE_UPDATE_FEATURED_LIST_UPDATE
    );
  }

  onGetFeaturedListUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.getFeaturedList,
      this.events.DATABASE_GET_FEATURED_LIST_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new DatabaseStore();
export default store;
