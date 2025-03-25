import { LitElement } from 'lit';
import {render, styles} from "./app-admin-database-user-single.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';

export default class AppAdminDatabaseUserSingle extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      username: { type: String },
      user: { type: Object }
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
    this.username = '';
    this.user = {};

    this.dataCtl = new PageDataController(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.queryCtl = new QueryParamsController(this, [
      {name: 'schema', defaultValue: ''}
    ]);

    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    await this.queryCtl.setFromLocation();
    this.orgName = e.location?.path?.[1] || '';
    this.dbName = e.location?.path?.[2] || '';
    this.username = e.location?.path?.[5] || '';
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
      },
    ], {ignoreLoading: true});
    if ( !r ) return;

    const user = this.dataCtl.users.find(user => user.name === this.username);
    if ( !user ) {
      this.AppStateModel.showError({message: `User '${this.username}' does not have access to this database`});
      return;
    }
    this._setUser(user);


    this.AppStateModel.hideLoading();
  }

  _setUser(data) {
    const user = {
      isAdmin: data?.pgFarmUser?.type === 'ADMIN',
      displayName: `${data?.pgFarmUser?.firstName} ${data?.pgFarmUser?.lastName}`.trim(),
      databaseGrant: grantDefinitions.getGrant('DATABASE', data),
      data
    };
    user.positions = (data?.pgFarmUser?.ucdPositions || [])
      .map(listing => [listing?.title, listing?.dept].filter(x => x).join(', '))
      .filter(x => x);
    user.showContactSection = user.displayName || user.positions.length;

    this.user = user;
    console.log('user', user);
  }

}

customElements.define('app-admin-database-user-single', AppAdminDatabaseUserSingle);
