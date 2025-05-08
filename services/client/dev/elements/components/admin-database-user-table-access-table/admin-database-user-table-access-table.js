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

    this.AppStateModel.showLoading();
    let r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.getTablesOverview(this.orgName, this.dbName),
        ctlProp: 'tablesOverview',
        errorMessage: 'Unable to load tables overview'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    this.tablesOverview = this.dataCtl.tablesOverview?.[0] || {};
    this.schema = this.tablesOverview.schema || '';

    this.AppStateModel.hideLoading();
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
    const isThisSchema = value === user?.schemaRole?.grant?.action;
    const isAnySchema = user?.schemaRoles?.some?.(role => role?.grant?.action === value);

    return isThisSchema || isAnySchema;
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
    const users = this.tableCtl.getRows().filter(u => u.selected);
    const access = this.selectedBulkAction;
    const accessLabel = this.bulkActions.find(a => a.value === this.selectedBulkAction)?.label || '';
    if (!users.length) return;

    this.AppStateModel.showLoading();
    const r = await this.dataCtl.batchGet(users.map(user => ({
      func: () => {
        console.log('about to update access', {
          orgName: this.orgName, 
          dbName: this.dbName, 
          schemaTableName: `${this.schema}.${this.tableName}`, 
          username: user.item?.user?.name, 
          access
        });
        this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, `${this.schema}.${this.tableName}`, user.item?.user?.name, access)
      },
      errorMessage: `Failed to update access for ${user.item?.user?.name}`
    })), {ignoreLoading: true});
    if ( !r ) return;
    let toastText = `User access has been updated to '${accessLabel}'`;
    this.AppStateModel.showToast({
      text: toastText,
      type: 'success',
      showOnPageLoad: true
    });
    this.AppStateModel.hideLoading();
    this.tableCtl.reset();
    this.AppStateModel.refresh();
  }

}

customElements.define('admin-database-user-table-access-table', AdminDatabaseUserTableAccessTable);
