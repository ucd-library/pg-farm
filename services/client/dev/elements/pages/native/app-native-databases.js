import { LitElement } from 'lit';
import {render, styles} from "./app-native-databases.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import {config} from '../../../../../../tools/lib/index.js';

import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';

export default class AppNativeDatabases extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      isLoggedIn: { type: Boolean },
      username : { type: String },
      results : { type: Array },
      total: { type: Number },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.dataCtl = new PageDataController(this);
    this.queryCtl = new QueryParamsController(this, [
      {name: 'orderBy', defaultValue: 'rank'},
      {name: 'limit', defaultValue: 10, type: 'number'},
      {name: 'offset', defaultValue: 0, type: 'number'}
    ]);
    this.total = 0;
    this.results = [];
    this._injectModel('AppStateModel', 'UserModel');
  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    this.AppStateModel.hideLoading();

    let user = await config.getUser();
    if( user.loggedIn !== true ) {
      return;
    }

    await this.queryCtl.setFromLocation();
    await this.dataCtl.get([
      {
        request: await this.UserModel.myDatabases(),
        hostCallback: '_onSearchSuccess',
        returnedResponse: 'request',
        errorMessage: 'Error when performing database search'
      },
    ])
  }

  _onSearchSuccess(e) {    
    let results = e.payload || [];
    results.sort((a, b) => {
      if (a.organizationId === b.organizationId) {
        return a.databaseTitle.localeCompare(b.databaseTitle);
      }
      return a.organizationId.localeCompare(b.organizationId);
    });

    results.forEach(db => {
      db.link = `/db/${db.organizationName || '_'}/${db.databaseName}`;
      db.linkTitle = (db.organizationTitle || db.organizationName ? (db.organizationTitle || db.organizationName) + ' - ' : '') + 
        (db.databaseTitle || db.databaseName);
      db.title = db.databaseTitle || db.databaseName;
      db.organization = {
        name: db.organizationName || '',
        title: db.organizationTitle || db.organizationName || '',
      }
      db.name = db.databaseName + '/edit';
      db.defaultIcon = db.icon;
    });

    this.total = results.length;
    this.results = results;
  }

}

customElements.define('app-native-databases', AppNativeDatabases);