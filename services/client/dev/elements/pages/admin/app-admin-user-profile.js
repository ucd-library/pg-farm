import { LitElement } from 'lit';
import {render, styles} from "./app-admin-user-profile.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import user from '@ucd-lib/pgfarm-client/utils/user.js';

export default class AppAdminUserProfile extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.dataCtl = new PageDataController(this);

    this._injectModel('AppStateModel', 'UserModel');
  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;

    let r = await this.dataCtl.get([
      {
        request: this.UserModel.getMe(),
        ctlProp: 'me',
        errorMessage: 'Unable to load user profile'
      }

    ], {ignoreLoading: true});
    if ( !r ) return;

    console.log(this.dataCtl.me);

    this.AppStateModel.hideLoading();
  }

}

customElements.define('app-admin-user-profile', AppAdminUserProfile);
