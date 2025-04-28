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

    // get schemas and table overview. db needs to be awake
    r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.getSchemas(this.orgName, this.dbName),
        ctlProp: 'schemas',
        errorMessage: 'Unable to load schemas'
      },
      {
        request: this.DatabaseModel.getUsers(this.orgName, this.dbName),
        ctlProp: 'users',
        errorMessage: 'Unable to get database users'
      },
      {
        request: this.queryCtl.schema.value ?
          this.DatabaseModel.getSchemaTablesOverview(this.orgName, this.dbName, this.queryCtl.schema.value) :
          this.DatabaseModel.getTablesOverview(this.orgName, this.dbName),
        ctlProp: 'tablesOverview',
        errorMessage: this.queryCtl.schema.value ?
          `Unable to load tables overview for schema ${this.queryCtl.schema.value}` :
          'Unable to load tables overview'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    // bail if the schema does not exist
    if (this.queryCtl.schema.value && !this.dataCtl.schemas.includes(this.queryCtl.schema.value)) {
      this.AppStateModel.showError({message: `Selected schema "${this.queryCtl.schema.value}" does not exist.`});
      return;
    }
    this.AppStateModel.hideLoading();

    // transform as needed
    const publicUser = window.APP_CONFIG?.publicUser?.username;
    this.tables = this.dataCtl.tablesOverview.map(table => {
      return {
        table,
        userCt: table.userAccess?.length || 0,
        accessSummary: publicUser && table.userAccess?.some(user => user === publicUser) ? 'Public' : 'Restricted'
      }
    });
  }

}

customElements.define('app-admin-database-tables', AppAdminDatabaseTables);
