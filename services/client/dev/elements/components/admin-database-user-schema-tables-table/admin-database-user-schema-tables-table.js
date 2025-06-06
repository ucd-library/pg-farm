import { LitElement, html } from 'lit';
import {render, styles} from "./admin-database-user-schema-tables-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';
import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';

export default class AdminDatabaseUserSchemaTablesTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      tables: {type: Array},
      bulkActions: {type: Array},
      selectedBulkAction: {type: String},
      orgName: { type: String},
      dbName: { type: String},
      username: { type: String},
      schema: { type: String}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.tables = [];
    this.bulkActions = grantDefinitions.getObjectGrants('TABLE').map(grant => {
      return {
        label: grant.roleLabel,
        value: grant.action
      }
    });
    this.selectedBulkAction = '';
    this.orgName = '';
    this.dbName = '';
    this.username = '';
    this.schema = '';

    const ctlOptions = {
      searchProps: ['user.name', 'user.pgFarmUser.firstName', 'user.pgFarmUser.lastName'],
      filters: [
        {id: 'table-access', cb: this._onTableAccessFilterChange}
      ]
    }
    this.tableCtl = new TableController(this, 'tables', ctlOptions);
    this.dataCtl = new PageDataController(this);

    this._injectModel('AppStateModel', 'DatabaseModel');

  }

  _onBulkActionSelect() {
    const tables = this.tableCtl.getSelectedItems().map(item => item.table);
    this.AppStateModel.showDialogModal({
      title: `Update Table Access`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Update Access', value: 'db-update-user-table-access', color: 'secondary'}
      ],
      content: html`<div>Update access for ${tables.length} table${tables.length > 1 ? 's' : ''} to '${this.selectedBulkAction}'</div>`,
    });
  }

  _onAppDialogAction(e){
    if ( e.action?.value === 'db-update-user-table-access' ) {
      this.updateTableAccess();
    }
  }

  /**
   * @description Update table access for the selected tables
   * @param {Array} tables - Array of tables to update access for. Defaults to selected tables
   * @param {String} access - Access level to set. Defaults to selected bulk action
   * @returns
   */
  async updateTableAccess(tables, access) {
    if ( !tables ) tables = this.tableCtl.getSelectedItems().map(item => item.table);
    if ( !access ) access = this.selectedBulkAction;
    if (!tables.length) return;

    const grants = tables.map(table => {
      return {
        user: this.username,
        schema: `${table.table_schema}.${table.table_name}`,
        permission: access === 'NONE' ? 'READ' : access
      }
    });
    this.AppStateModel.showLoading();
    const r = access === 'NONE' ?
      await this.DatabaseModel.bulkRevokeAccess(this.orgName, this.dbName, grants) :
      await this.DatabaseModel.bulkGrantAccess(this.orgName, this.dbName, grants);
    if ( r.state === 'error' ){
      this.AppStateModel.showError({
        message: 'Error updating table access',
        error: r.error
      });
      return;
    }
    let toastText = tables.length === 1 ?
      `Table '${tables[0].table_name}' access has been updated to '${access}'` :
      `${tables.length} tables access have been updated to '${access}'`;
    this.AppStateModel.showToast({
      text: toastText,
      type: 'success',
      showOnPageLoad: true
    });
    this.AppStateModel.hideLoading();
    this.tableCtl.reset();
    this.AppStateModel.refresh();
  }

  /**
   * @description Table access dropdown change
   * @param {Object} e - The custom event object
   */
  _onTableAccessChange(e) {
    const access = e.detail.value;
    const tableName = e.currentTarget.dataset.tablename || '';
    if( !tableName || !this.username || !access ) return;

    this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, `${this.schema}.${tableName}`, this.username, access);

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
   * @description Callback to determine whether to show user based on table access filter
   * @param {Object} table - The table object from this.tables array
   * @param {String} value - The value of the filter
   * @returns {Boolean} - True if the table should be shown, false otherwise
   */
  _onTableAccessFilterChange(table, value) {
    if ( !value ) return true;

    if ( value === 'SOME' ) {
      return table?.grant?.action !== 'NONE';
    } else {
      return table?.grant?.action === value;
    }
  }

}

customElements.define('admin-database-user-schema-tables-table', AdminDatabaseUserSchemaTablesTable);
