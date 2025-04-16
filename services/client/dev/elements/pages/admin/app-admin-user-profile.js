import { LitElement } from 'lit';
import {render, styles} from "./app-admin-user-profile.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';

export default class AppAdminUserProfile extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      displayName: { type: String },
      orgs: { type: Array },
      totalOrgs: { type: Number }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.dataCtl = new PageDataController(this);
    this.displayName = '';
    this.orgs = [];
    this.totalOrgs = 0;

    this._injectModel('AppStateModel', 'UserModel', 'OrganizationModel');
  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;

    let r = await this.dataCtl.get([
      {
        request: this.UserModel.getMe(),
        ctlProp: 'me',
        errorMessage: 'Unable to load user profile'
      },
      {
        request: this.OrganizationModel.search({onlyMine: true}),
        hostCallback: '_onOrgFetchSuccess',
        returnedResponse: 'request',
        errorMessage: 'Unable to load your organizations'
      }

    ], {ignoreLoading: true});
    if ( !r ) return;
    this.displayName = `${this.dataCtl.me.firstName || ''} ${this.dataCtl.me.lastName || ''}`.trim() ?
      `${this.dataCtl.me.firstName || ''} ${this.dataCtl.me.lastName || ''}` :
      this.dataCtl.me.username;

    this.AppStateModel.hideLoading();
  }

  _onOrgFetchSuccess(e) {
    const data = this.OrganizationModel.getSearchResult(e.id).payload;
    this.totalOrgs = data.total;
    this.orgs = data.items;
    console.log('organizations', this.orgs);
  }

}

customElements.define('app-admin-user-profile', AppAdminUserProfile);
