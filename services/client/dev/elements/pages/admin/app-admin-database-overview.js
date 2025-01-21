import { LitElement, html } from 'lit';
import {render, styles} from "./app-admin-database-overview.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '../../../controllers/PageDataController.js';
import '../../components/admin-database-overview-form/admin-database-overview-form.js';

/**
 * @class AppAdminDatabaseOverview
 * @description Admin page for viewing and editing database overview (metadata) information
 * @prop {String} pageId - unique id for this page
 * @prop {String} orgName - organization name. Passed in from app state
 * @prop {String} dbName - database name. Passed in from app state
 */
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

  /**
   * @description Show a modal with the database overview form, so user can edit the database metadata
   */
  showEditModal(){
    this.AppStateModel.showDialogModal({
      title: `Edit Database: ${this.dataCtl.db?.title}`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Save Changes', value: 'db-overview-save', color: 'secondary', disableOnLoading: true}
      ],
      content: html`<admin-database-overview-form .db=${this.dataCtl?.db} .isFeatured=${this.dataCtl.isFeatured}></admin-database-overview-form>`,
      actionCallback: this._onModalAction
    });
  }

  /**
   * @description Handle app modal actions. Save the database metadata if the user clicks the save button
   * @param {String} action - action keyword value from the app modal
   * @param {Element} modalEle - the app modal element
   * @returns
   */
  async _onModalAction(action, modalEle){
    if ( action === 'db-overview-save' ) {
      const form = modalEle.renderRoot.querySelector('admin-database-overview-form');
      if ( !form.reportValidity() ) return {abortModalAction: true};
      modalEle._loading = true;
      const r = await form.submit();
      modalEle._loading = false;
      form.db = {};
      if ( r ) this.AppStateModel.refresh();
    }
  }

  /**
   * @description Callback for when the featured database list is loaded. Set the isFeatured flag if this database is in the list
   * @param {Array} e - Array of database objects
   */
  _onFeaturedList(e){
    this.dataCtl.isFeatured = e.some(db => `${db?.organization?.name}/${db?.name}` === `${this.orgName}/${this.dbName}`);
  }

}

customElements.define('app-admin-database-overview', AppAdminDatabaseOverview);
