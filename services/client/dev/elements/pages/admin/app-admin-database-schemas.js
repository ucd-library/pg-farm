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
        request: this.DatabaseModel.getUsers(this.orgName, this.dbName),
        ctlProp: 'users',
        errorMessage: 'Unable to get database users'
      },
      {
        request: this.DatabaseModel.getSchemas(this.orgName, this.dbName),
        ctlProp: 'schemas',
        errorMessage: 'Unable to load schemas'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    // get tables for each schema
    const tables = await this.dataCtl.get(this.dataCtl.schemas.map(schema => {
      return {
        request: this.DatabaseModel.getSchemaTables(this.orgName, this.dbName, schema),
        errorMessage: `Unable to load tables for schema ${schema}`,
      }
    }
    ), {ignoreLoading: true});
    if ( !tables ) return;

    // get user schema access
    const userSchemaProduct = this.dataCtl.schemas.flatMap(schema =>
      this.dataCtl.users.map(user => ({ schema, user: user.name }))
    );
    const schemaAccess = await this.dataCtl.batchGet(userSchemaProduct.map(({ schema, user }) => ({
      func: () => this.DatabaseModel.getSchemaUserAccess(this.orgName, this.dbName, schema, user),
      errorMessage: `Unable to get access for user ${user} on schema ${schema}`
    })), {ignoreLoading: true});
    if ( !schemaAccess ) return;

    // put it all together
    this.schemas = this.dataCtl.schemas.map(schema => {
      const access = schemaAccess.filter(r => r.response?.value?.schema === schema).map(r => r.response.value);
      const userCt = access.filter(r => r.payload.schema.length).length;
      const isPublic = access.find(r => r.user === 'pgfarm-public' && r.payload.schema.length ) ? true : false;
      const publicTableCt = Object.keys(access.find(r => r.user === 'pgfarm-public')?.payload?.tables || {}).length;
      return {
        name: schema,
        tables: tables.find(t => t.response.value.schema === schema).response.value.payload,
        userCt,
        isPublic,
        publicTableCt
      }
    });

    this.AppStateModel.hideLoading();
  }

}

customElements.define('app-admin-database-schemas', AppAdminDatabaseSchemas);
