import { LitElement } from 'lit';
import {render, styles} from "./app-admin-database-schemas.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';

export default class AppAdminDatabaseSchemas extends Mixin(LitElement)
.with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      schemas: { type: Array }
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
    this.schemas = [];

    this.dataCtl = new PageDataController(this);

    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  /**
     * @description Callback for when the app state is updated
     * @param {Object} e - app state update event
     * @returns
     */
  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
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

    // get data that requires the database to be awake
    r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.getTablesOverview(this.orgName, this.dbName),
        ctlProp: 'tablesOverview',
        errorMessage: 'Unable to load tables overview'
      },
      {
        request: this.DatabaseModel.getSchemasOverview(this.orgName, this.dbName),
        ctlProp: 'schemasOverview',
        errorMessage: 'Unable to load schemas overview'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    // combine data
    this.schemas = this.dataCtl.schemasOverview.map(schema => {
      const tables = this.dataCtl.tablesOverview.filter(t => t.schema === schema.name);
      const publicUser = window.APP_CONFIG?.publicUser?.username;
      const publicTables = publicUser ? tables.filter(t => t.userAccess.some(user => user === publicUser)) : [];
      return {
        schema,
        publicTableCt: publicTables.length
      }
    });

    this.AppStateModel.hideLoading();
  }

}

customElements.define('app-admin-database-schemas', AppAdminDatabaseSchemas);
