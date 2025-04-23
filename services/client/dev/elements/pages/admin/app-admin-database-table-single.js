import { LitElement } from 'lit';
import {render, styles} from "./app-admin-database-table-single.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';

export default class AppAdminDatabaseTableSingle extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      users: { type: Array }
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
        request: this.DatabaseModel.getUsers(this.orgName, this.dbName),
        ctlProp: 'users',
        errorMessage: 'Unable to get database users'
      },
      {
        request: this.DatabaseModel.get(this.orgName, this.dbName),
        ctlProp: 'db',
        errorMessage: 'Unable to load database'
      },
    ], {ignoreLoading: true});
    if ( !r ) return;
  
    console.log('db', this.dataCtl?.db);
    console.log(e.page, this.pageId)


    console.log('ran DatabaseModel.getUsers, resp:', r);
    this.users = this.dataCtl.users || [];
    console.log('users:', this.users);

    // merge it all together
    // this.users = this.dataCtl.users.map(user => {
    //   const access = schemaAccess.filter(r => r.response?.value?.user === user.name).map(r => r.response.value);
    //   const tableCt = access.reduce((acc, r) => acc + Object.keys(r.payload.tables).length, 0);

    //   let schemaRole;
    //   let schemaRoles = [];
    //   if ( access.length ){

    //     // one schema selected, only need to show access summary to that one
    //     if ( selectedSchemas.length === 1 ){
    //       schemaRole = {
    //         privileges: access[0].payload?.schema,
    //         grant: grantDefinitions.getGrant('SCHEMA', access[0].payload?.schema)
    //       }

    //     // multiple schemas selected, If all access the same, show that. Otherwise show 'varies'
    //     } else {
    //       schemaRoles = access.map(r => ({
    //         schema: r.payload?.schema,
    //         privileges: r.payload?.schema,
    //         grant: grantDefinitions.getGrant('SCHEMA', r.payload?.schema)
    //       }));

    //       const allSame = schemaRoles.every((r, i, arr) => r.grant.action === arr[0].grant.action);
    //       if ( allSame ){
    //         schemaRole = {
    //           privileges: schemaRoles[0].privileges,
    //           grant: schemaRoles[0].grant
    //         }
    //       } else {
    //         schemaRole = {
    //           privileges: [],
    //           grant: {action: 'VARIES', roleLabel: 'Varies' }
    //         }
    //       }
    //     }
    //   }

    //   return {
    //     user,
    //     tableCt,
    //     schemaRole,
    //     schemaRoles
    //   }
    // });
    this.AppStateModel.hideLoading();
  }

}

customElements.define('app-admin-database-table-single', AppAdminDatabaseTableSingle);
