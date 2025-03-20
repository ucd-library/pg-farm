import { LitElement } from 'lit';
import {render, styles} from "./app-admin-database-tables.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';

export default class AppAdminDatabaseTables extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      tables: { type: Array }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.orgName = '';
    this.dbName = '';
    this.tables = [];

    this.idGen = new IdGenerator({randomPrefix: true});
    this.dataCtl = new PageDataController(this);
    this.queryCtl = new QueryParamsController(this, [
      {name: 'schema', defaultValue: ''}
    ]);

    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  /**
     * @description Callback for when the app state is updated
     * @param {Object} e - app state update event
     * @returns
     */
  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    await this.queryCtl.setFromLocation();
    this.orgName = e.location?.path?.[1] || '';
    this.dbName = e.location?.path?.[2] || '';
    this.dataCtl.isFeatured = false;
    this.AppStateModel.showLoading();
    let r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.isAdmin(this.orgName, this.dbName),
        ctlProp: 'isAdmin',
        errorMessage: 'You do not have permission to view this page'
      },
      {
        request: this.DatabaseModel.get(this.orgName, this.dbName),
        ctlProp: 'db',
        errorMessage: 'Unable to load database'
      },
    ], {ignoreLoading: true});
    if ( !r ) return;

    if ( this.dataCtl?.db?.instance?.state === 'SLEEP' ) {
      this.AppStateModel.hideLoading();
      return;
    }

    // get schemas. db needs to be awake
    r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.getSchemas(this.orgName, this.dbName),
        ctlProp: 'schemas',
        errorMessage: 'Unable to load schemas'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    // get schema tables. need to know what schemas to get
    const selectedSchemas = this.dataCtl.schemas.includes(this.queryCtl.schema.value) ? [this.queryCtl.schema.value] : this.dataCtl.schemas;
    r = await this.dataCtl.get(selectedSchemas.map(schema => ({
      request: this.DatabaseModel.getSchemaTables(this.orgName, this.dbName, schema),
      errorMessage: `Unable to load tables for schema ${schema}`
    })), {ignoreLoading: true});
    if ( !r ) return;

    const tables = [];
    r.forEach(r => {
      (r.response.value.payload || []).forEach(table => {
        const t = {
          table: table
        }
        tables.push(t);
      });
    });

    // get access for each table
    r = await this.dataCtl.get(tables.map(t => ({
      request: this.DatabaseModel.getSchemaTableAccess(this.orgName, this.dbName, t.table.table_schema, t.table.table_name),
      errorMessage: `Unable to load table access for ${t.table.table_schema}:${t.table.name}`
    })));
    if ( !r ) return;
    r.forEach(r => {
      const response = r.response.value;
      const table = tables.find(t => t?.table?.table_schema === response.schema && t?.table?.table_name === response.table);
      if ( !table ) {
        this.logger.warn(`Unable to find table ${response.schema}:${response.table} in tables list`);
        return;
      }
      table.access = response.payload;
      table.userCt = Object.keys(table.access).length;
      table.accessSummary = table.access['pgfarm-public'] ? 'Public' : 'Restricted';
    });
    this.tables = tables;
  }

}

customElements.define('app-admin-database-tables', AppAdminDatabaseTables);
