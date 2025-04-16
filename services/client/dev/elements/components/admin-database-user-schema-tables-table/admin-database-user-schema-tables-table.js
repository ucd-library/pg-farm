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

    this.tableCtl = new TableController(this, 'tables');
    this.dataCtl = new PageDataController(this);

    this._injectModel('AppStateModel', 'DatabaseModel');

  }

  _onBulkActionSelect() {
    const tables = this.tableCtl.getSelectedItems().map(item => item.table);
    console.log(this.selectedBulkAction, tables);
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
    this.AppStateModel.showLoading();
    const r = await this.dataCtl.batchGet(tables.map(table => ({
      func: () => this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, `${table.table_schema}.${table.table_name}`, this.username, access),
      errorMessage: `Failed to update access for ${table.table_name}`
    })), {ignoreLoading: true});
    if ( !r ) return;
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

}

customElements.define('admin-database-user-schema-tables-table', AdminDatabaseUserSchemaTablesTable);
