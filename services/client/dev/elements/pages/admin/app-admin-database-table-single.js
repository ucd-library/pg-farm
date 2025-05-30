import { LitElement } from 'lit';
import {render, styles} from "./app-admin-database-table-single.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';

export default class AppAdminDatabaseTableSingle extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      users: { type: Array },
      tablesOverview: { type: Object },
      schema: { type: String },
      tableName: { type: String },
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
    this.users = [];
    this.tablesOverview = {};
    this.schema = '';
    this.tableName = '';

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
    this.tableName = e.location?.path?.[5] || '';
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
      {
        request: this.DatabaseModel.getSchemas(this.orgName, this.dbName),
        ctlProp: 'schemas',
        errorMessage: 'Unable to load schemas'
      },
      {
        request: this.DatabaseModel.getUserAccessOverview(this.orgName, this.dbName),
        ctlProp: 'userAccessOverview',
        errorMessage: 'Unable to load user access overview'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    this.schema = this.AppStateModel.location.query.schema || '';
    this.users = this.dataCtl.userAccessOverview.map(user => {
      let schemaRole;
      let schemaRoles = [];
      const schema = user.schemas.find(s => s.name === this.schema);
      if( schema ) {
        const tableAccess = (schema.tableAccess || []).find(t => t.name === this.tableName)?.access || [];          

        schemaRole = {
          privileges: tableAccess,
          grant: grantDefinitions.getGrant('TABLE', tableAccess)
        }

        return {
          user,
          schemaRole,
          schemaRoles,
          tableCt: user.tableAccessCount
        }
      }
    });

    this.AppStateModel.hideLoading();
  }

}

customElements.define('app-admin-database-table-single', AppAdminDatabaseTableSingle);
