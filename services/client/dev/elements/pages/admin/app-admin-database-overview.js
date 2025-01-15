import { LitElement } from 'lit';
import {render, styles} from "./app-admin-database-overview.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '../../../controllers/PageDataController.js';

export default class AppAdminDatabaseOverview extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String}
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
    this.dataCtl.isAdmin = false;
    await this.dataCtl.get([
      {request: this.DatabaseModel.get(this.orgName, this.dbName), ctlProp: 'db', errorMessage: 'Unable to load database'}
    ]);
  }

}

customElements.define('app-admin-database-overview', AppAdminDatabaseOverview);
