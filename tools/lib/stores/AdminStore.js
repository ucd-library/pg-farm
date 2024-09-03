import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';

class AdminStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      databaseMetadata : new LruStore({name: 'admin.databaseMetadata'}),
      databaseUsers : new LruStore({name: 'admin.databaseUsers'}),
      databaseSchemas : new LruStore({name: 'admin.databaseSchemas'}),
      schemaTables : new LruStore({name: 'admin.schemaTables', maxSize: 200}),
      tableAccess : new LruStore({name: 'admin.tableAccess', maxSize: 200}),
      tableAccessByUser : new LruStore({name: 'admin.tableAccessByUser', maxSize: 20}),
    };
    this.events = {
      DATABASE_METADATA_UPDATE : 'database-metadata-update',
      DATABASE_USERS_UPDATE : 'database-users-update',
      DATABASE_SCHEMAS_UPDATE : 'database-schemas-update',
      SCHEMA_TABLES_UPDATE : 'schema-tables-update',
      TABLE_ACCESS_UPDATE : 'table-access-update',
      TABLE_ACCESS_BY_USER_UPDATE : 'table-access-by-user-update'
    };
  }


  /* Database Users */
  onDatabaseUsersLoading(org, db, request) {
    this._onDatabaseUsersUpdate(
      this._getBasePayload({org, db}, this.STATE.LOADING, null, null, request)
    );
  }

  onDatabaseUsersLoaded(org, db, payload) {
    this._onDatabaseUsersUpdate(
      this._getBasePayload({org, db}, this.STATE.LOADED, payload),
    );
  }

  onDatabaseUsersError(org, db, error) {
    this._onDatabaseUsersUpdate(
      this._getBasePayload({org, db}, this.STATE.ERROR, null, error)
    );
  }

  _onDatabaseUsersUpdate(result) {
    this.data.databaseUsers.set(result.id, result);
    this.emit(this.events.DATABASE_USERS_UPDATE, result);
  }

  /* Database Schemas */
  onDatabaseSchemasLoading(org, db, request) {
    this._onDatabaseSchemasUpdate(
      this._getBasePayload({org, db}, this.STATE.LOADING, null, null, request)
    );
  }

  onDatabaseSchemasLoaded(org, db, payload) {
    this._onDatabaseSchemasUpdate(
      this._getBasePayload({org, db}, this.STATE.LOADED, payload),
    );
  }

  onDatabaseSchemasError(org, db, error) {
    this._onDatabaseSchemasUpdate(
      this._getBasePayload({org, db}, this.STATE.ERROR, null, error)
    );
  }

  _onDatabaseSchemasUpdate(result) {
    this.data.databaseSchemas.set(result.id, result);
    this.emit(this.events.DATABASE_SCHEMAS_UPDATE, result);
  }

  /* Schema Tables */
  onSchemaTablesLoading(org, db, schema, request) {
    this._onSchemaTablesUpdate(
      this._getBasePayload({org, db, schema}, this.STATE.LOADING, null, null, request)
    );
  }

  onSchemaTablesLoaded(org, db, schema, payload) {
    this._onSchemaTablesUpdate(
      this._getBasePayload({org, db, schema}, this.STATE.LOADED, payload),
    );
  }

  onSchemaTablesError(org, db, schema, error) {
    this._onSchemaTablesUpdate(
      this._getBasePayload({org, db, schema}, this.STATE.ERROR, null, error)
    );
  }

  _onSchemaTablesUpdate(result) {
    this.data.schemaTables.set(result.id, result);
    this.emit(this.events.SCHEMA_TABLES_UPDATE, result);
  }

  /* Table Access */
  onTableAccessLoading(org, db, schema, table, request) {
    this._onTableAccessUpdate(
      this._getBasePayload({org, db, schema, table}, this.STATE.LOADING, null, null, request)
    );
  }

  onTableAccessLoaded(org, db, schema, table, payload) {
    this._onTableAccessUpdate(
      this._getBasePayload({org, db, schema, table}, this.STATE.LOADED, payload),
    );
  }

  onTableAccessError(org, db, schema, table, error) {
    this._onTableAccessUpdate(
      this._getBasePayload({org, db, schema, table}, this.STATE.ERROR, null, error)
    );
  }

  _onTableAccessUpdate(result) {
    this.data.tableAccess.set(result.id, result);
    this.emit(this.events.TABLE_ACCESS_UPDATE, result);
  }

  /* Table Access By User */
  onTableAccessByUserLoading(org, db, schema, user, request) {
    this._onTableAccessByUserUpdate(
      this._getBasePayload({org, db, schema, user}, this.STATE.LOADING, null, null, request)
    );
  }

  onTableAccessByUserLoaded(org, db, schema, user, payload) {
    this._onTableAccessByUserUpdate(
      this._getBasePayload({org, db, schema, user}, this.STATE.LOADED, payload),
    );
  }

  onTableAccessByUserError(org, db, schema, user, error) {
    this._onTableAccessByUserUpdate(
      this._getBasePayload({org, db, schema, user}, this.STATE.ERROR, null, error)
    );
  }

  _onTableAccessByUserUpdate(result) {
    this.data.tableAccessByUser.set(result.id, result);
    this.emit(this.events.TABLE_ACCESS_BY_USER_UPDATE, result);
  }

}

const store = new AdminStore();
export default store;