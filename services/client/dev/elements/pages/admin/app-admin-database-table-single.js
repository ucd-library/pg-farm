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
        request: this.DatabaseModel.getUsers(this.orgName, this.dbName),
        ctlProp: 'users',
        errorMessage: 'Unable to get database users'
      },
      {
        request: this.DatabaseModel.get(this.orgName, this.dbName),
        ctlProp: 'db',
        errorMessage: 'Unable to load database'
      },
      {
        request: this.DatabaseModel.getTablesOverview(this.orgName, this.dbName),
        ctlProp: 'tablesOverview',
        errorMessage: 'Unable to load tables overview'
      },
      {
        request: this.DatabaseModel.getSchemas(this.orgName, this.dbName),
        ctlProp: 'schemas',
        errorMessage: 'Unable to load schemas'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    this.tablesOverview = this.dataCtl.tablesOverview.find(t => t.tableName === this.tableName) || {};
    this.schema = this.tablesOverview.schema || '';
    this.users = (this.dataCtl.users || []).filter(user => (this.tablesOverview.userAccess || []).includes(user.name));
    
    r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.getSchemaTableAccess(this.orgName, this.dbName, this.schema, this.tableName),
        ctlProp: 'schemaTableAccess',
        errorMessage: `Unable to load table access for ${this.schema}:${this.tableName}`
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    const userSchemaProduct = [this.schema].flatMap(schema =>
      this.users.map(user => ({ schema, user: user.name }))
    );
    const schemaAccess = await this.dataCtl.batchGet(userSchemaProduct.map(({ schema, user }) => ({
      func: () => this.DatabaseModel.getSchemaUserAccess(this.orgName, this.dbName, schema, user),
      errorMessage: `Unable to get access for user ${user} on schema ${schema}`
    })), {ignoreLoading: true});
    if ( !schemaAccess ) return;

    // merge it all together
    this.users = this.users.map(user => {
      const access = schemaAccess.filter(r => r.response?.value?.user === user.name).map(r => r.response.value);

      let schemaRole;
      let schemaRoles = [];
      if ( access.length ){
        schemaRole = {
          grant: grantDefinitions.getGrant('TABLE', access[0].payload?.tables[this.tableName])
        }
      }

      return {
        user,
        schemaRole,
        schemaRoles
      }
    });

    this.AppStateModel.hideLoading();
  }

}

customElements.define('app-admin-database-table-single', AppAdminDatabaseTableSingle);
