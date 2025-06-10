import { LitElement, html } from 'lit';
import {render, styles} from "./admin-database-user-table-access-table.tpl.js";

import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import AppComponentController from '@ucd-lib/pgfarm-client/controllers/AppComponentController.js';

/**
 * @description Admin Database User Table Access Table
 * @property {String} orgName - The name of the organization
 * @property {String} dbName - The name of the database
 * @property {Array} users - The list of users to display
 * @property {Array} bulkActions - The list of bulk actions available
 * @property {String} selectedBulkAction - The selected bulk action
 */
export default class AdminDatabaseUserTableAccessTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      users: {type: Array},
      bulkActions: {type: Array},
      selectedBulkAction: {type: String},
      orgName: { type: String},
      dbName: { type: String},
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.users = [];
    this._setBulkActions();
    this.selectedBulkAction = '';

    this.dataCtl = new PageDataController(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.queryCtl = new QueryParamsController(this, [
      {name: 'schema', defaultValue: ''}
    ]);
    this.compCtl = new AppComponentController(this);

    const ctlOptions = {
      searchProps: ['user.name', 'user.pgFarmUser.firstName', 'user.pgFarmUser.lastName'],
      filters: [
        {id: 'schema-access', cb: this._onSchemaAccessFilterChange}
      ]
    }
    this.tableCtl = new TableController(this, 'users', ctlOptions);

    this._injectModel('AppStateModel', 'InstanceModel', 'DatabaseModel');
  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.compCtl.parentPageId ) return;

    this.orgName = e.location?.path?.[1] || '';
    this.dbName = e.location?.path?.[2] || '';
    this.tableName = e.location?.path?.[5] || '';

    await this.queryCtl.setFromLocation();
    this._setBulkActions();

    this.schema = this.AppStateModel.location.query.schema || '';
  }

  /**
   * @description Table access dropdown change
   * @param {Object} e - The custom event object
   */
  _onTableAccessChange(e) {
    const username = e.currentTarget.dataset.username || '';
    const access = e.detail.value;
    if( !username || !access ) return;

    this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, `${this.schema}.${this.tableName}`, username, access);

    const accessLabel = this.bulkActions.find(a => a.value === access)?.label || '';
    const toastText = `User access has been updated to '${accessLabel}'`;
    this.AppStateModel.showToast({
      text: toastText,
      type: 'success',
      showOnPageLoad: true
    });
    this.AppStateModel.hideLoading();
  }

  /**
   * @description Callback to determine whether to show user based on schema access filter
   * @param {Object} user - The user object from this.users array
   * @param {String} value - The value of the filter
   * @returns {Boolean} - True if the user should be shown, false otherwise
   */
  _onSchemaAccessFilterChange(user, value) {
    if ( !value ) return true;
    if ( value === 'SOME' ) {
      return user?.schemaRole?.grant?.action !== 'NONE';
    }
    const isThisSchema = value === user?.schemaRole?.grant?.action;

    return isThisSchema;
  }

  /**
   * @description Sets the bulk actions available for the table based on state of component
   */
  _setBulkActions() {
    const bulkActions = [
      {value: 'READ', label: 'Viewer'},
      {value: 'WRITE', label: 'Editor'},
      {value: 'NONE', label: 'No Access'}
    ];
    this.bulkActions = bulkActions;
  }

  /**
   * @description Callback for when a bulk action is selected by the user
   */
  _onBulkActionSelect() {
    const users = this.tableCtl.getRows()
      .filter(u => u.selected)
      .map(row => row.item?.user?.name);
    const accessLabel = this.bulkActions.find(a => a.value === this.selectedBulkAction)?.label || '';
    this.AppStateModel.showDialogModal({
      title: `Update Table Access`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Update Access', value: 'db-update-user-table-access', color: 'secondary'}
      ],
      content: html`<div>Update access for ${users.length} user${users.length > 1 ? 's' : ''} to '${accessLabel}'</div>`,
    });
  }

  /**
   * @description Callback for when any application dialog action is triggered
   * @param {Object} e - The event object
   * @param {Object} e.action - The action object specified when launching the dialog
   * @param {Object} e.data - The data object specified when launching the dialog
   * @returns
   */
  _onAppDialogAction(e){
    if ( e.action?.value === 'db-update-user-table-access' ) {
      this.updateUserAccess();
    }
  }

  /**
   * @description Update users access for the table being viewed
   */
  async updateUserAccess() {
    let users = this.tableCtl.getRows().filter(u => u.selected);
    if (!users.length) return;

    users = users.map(row => row.item?.user?.name);
    const access = this.selectedBulkAction;
    // const accessLabel = this.bulkActions.find(a => a.value === this.selectedBulkAction)?.label || '';
    const grants = users.map(user => {
      let permission = 'READ';
      if( access !== 'NONE' ) permission = access;
      return {
          user,
          schema: `${this.schema}.${this.tableName}`,
          permission
        }
    });

    this.AppStateModel.showLoading();

    if( access !== 'NONE' ) {
      const r = await this.DatabaseModel.bulkGrantAccess(this.orgName, this.dbName, grants);
      if ( r.state === 'error' ){
        this.AppStateModel.showError({
          message: 'Unable to add user access',
          error: r.error
        });
        return;
      }

      this.AppStateModel.showToast({
        type: 'success',
        text: `User access has been added`,
        showOnPageLoad: true
      });
    } else {
      const r = await this.DatabaseModel.bulkRevokeAccess(this.orgName, this.dbName, grants);
      if ( r.state === 'error' ){
        this.AppStateModel.showError({
          message: 'Unable to remove user access',
          error: r.error
        });
        return;
      }
      this.AppStateModel.showToast({
        type: 'success',
        text: `User access has been removed`,
        showOnPageLoad: true
      });
    }

    this.AppStateModel.hideLoading();
    this.tableCtl.reset();
    this.AppStateModel.refresh();
  }

}

customElements.define('admin-database-user-table-access-table', AdminDatabaseUserTableAccessTable);
