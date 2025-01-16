import { LitElement, html } from 'lit';
import {render, styles} from "./app-admin-database-overview.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '../../../controllers/PageDataController.js';
import '../../components/admin-database-overview-form/admin-database-overview-form.js';

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
    this.dataCtl.isFeatured = false;
    await this.dataCtl.get([
      {
        request: this.DatabaseModel.get(this.orgName, this.dbName),
        ctlProp: 'db',
        errorMessage: 'Unable to load database'
      },
      {
        request: this.DatabaseModel.getFeaturedList(this.orgName),
        hostCallback: '_onFeaturedList',
        errorMessage: 'Unable to load featured databases'
      },
    ]);
  }

  showEditModal(){
    this.AppStateModel.showDialogModal({
      title: `Edit Database: ${this.dataCtl.db?.title}`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Save Changes', value: 'db-overview-save', color: 'secondary'}
      ],
      content: html`<admin-database-overview-form .db=${this.dataCtl?.db} .isFeatured=${this.dataCtl.isFeatured}></admin-database-overview-form>`,
      actionCallback: this._onModalAction
    });
  }

  _onModalAction(action, modalEle){
    if ( action === 'db-overview-save' ) {
      const form = modalEle.renderRoot.querySelector('admin-database-overview-form');
      if ( !form.reportValidity() ) return {abortModalAction: true};
      console.log(form.payload);
      form.db = {};
    }
  }

  _onFeaturedList(e){
    this.dataCtl.isFeatured = e.some(db => `${db?.organization?.name}/${db?.name}` === `${this.orgName}/${this.dbName}`);
  }

}

customElements.define('app-admin-database-overview', AppAdminDatabaseOverview);
