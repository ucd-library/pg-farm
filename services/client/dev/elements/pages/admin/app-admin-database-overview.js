import { LitElement, html } from 'lit';
import {render, styles} from "./app-admin-database-overview.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-overview-form/admin-database-overview-form.js';

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
      dbName: { type: String},
      counts: { type: Object }
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
    this.resetCounts();

    this.dataCtl = new PageDataController(this);

    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  /**
   * @description Reset the counts object to default values
   */
  resetCounts(){
    const counts = {};
    ['schemas', 'users', 'tables'].forEach(key => {
      counts[key] = {
        total: 0,
        totalPublic: 0
      }
    })
    this.counts = counts;
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
    this.resetCounts();
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
      {
        request: this.DatabaseModel.getFeaturedList(this.orgName),
        hostCallback: '_onFeaturedList',
        errorMessage: 'Unable to load featured databases'
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
      },
    ], {ignoreLoading: true});
    if ( !r ) return;

    this.counts.users.total = this.dataCtl.users.length;
    this.counts.users.totalPublic = this.dataCtl.users.filter(u => u.pgFarmUser?.type === 'PUBLIC').length;
    this.counts.schemas.total = this.dataCtl.schemas.length;

    // get tables for each schema
    const tables = (await this.dataCtl.batchGet(this.dataCtl.schemas.map(schema => {
      return {
        func: () => this.DatabaseModel.getSchemaTables(this.orgName, this.dbName, schema),
        errorMessage: `Unable to load tables for schema ${schema}`,
      }
    }
    ), {ignoreLoading: true})).flatMap(t => t.response.value.payload);
    if ( !tables ) return;
    this.counts.tables.total = tables.length;

    // get schema access for all public users
    const userSchemaProduct = this.dataCtl.schemas.flatMap(schema =>
      this.dataCtl.users
        .filter(u => u.pgFarmUser?.type === 'PUBLIC')
        .map(user => ({ schema, user: user.name }))
    );
    const schemaAccess = (await this.dataCtl.batchGet(userSchemaProduct.map(({ schema, user }) => ({
      func: () => this.DatabaseModel.getSchemaUserAccess(this.orgName, this.dbName, schema, user),
      errorMessage: `Unable to get access for user ${user} on schema ${schema}`
    })), {ignoreLoading: true})).map(r => r.response.value);
    if ( !schemaAccess ) return;

    // get counts of public schemas and tables
    this.counts.schemas.totalPublic = this.dataCtl.schemas.filter(schema => schemaAccess.find(r => r.schema == schema && r.payload.schema.length)).length;
    this.counts.tables.totalPublic = tables.filter(t => schemaAccess.find(r => r.schema == t.table_schema && r.payload.tables[t.table_name])).length;

    this.requestUpdate();
    this.AppStateModel.hideLoading();
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
   * @param {Array} payload - Array of database objects
   */
  _onFeaturedList(payload){
    this.dataCtl.isFeatured = payload.some(db => `${db?.organization?.name}/${db?.name}` === `${this.orgName}/${this.dbName}`);
  }

}

customElements.define('app-admin-database-overview', AppAdminDatabaseOverview);
