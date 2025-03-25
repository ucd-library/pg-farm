import { LitElement } from 'lit';
import {render, styles} from "./admin-database-tables-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';

export default class AdminDatabaseTablesTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {


  static get properties() {
    return {
      tables: {type: Array},
      bulkActions: {type: Array},
      selectedBulkAction: {type: String}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.tables = [];
    this.bulkActions = [
      {value: 'add-users', label: 'Add Users'},
      {value: 'remove-users', label: 'Remove Users'}
    ];
    this.selectedBulkAction = '';

    const ctlOptions = {
      searchProps: ['table.table_name'],
      filters: [{id: 'table-access', cb: this._onTableAccessFilterChange}]
    }
    this.tableCtl = new TableController(this, 'tables', ctlOptions);
    console.log({ tableCtl: this.tableCtl });

    this._injectModel('AppStateModel');
  }

  /**
   * @description Callback for when the app state is updated
   * @param {Object} e - app state update event
   * @returns
  */
  async _onAppStateUpdate(e){
    if ( e.location?.path?.[0] !== 'db' ) return;
    this.orgName = e.location?.path?.[1] || '';
    this.dbName = e.location?.path?.[2] || '';
    this.tableUrl = `/db/${this.orgName}/${this.dbName}/edit/tables`;
  }

  _onBulkActionSelect() {
    console.log('TODO: ' + this.selectedBulkAction);
  }

  _onTableAccessFilterChange(table, value) {
    if ( !value ) return true;
    return table.accessSummary == value;
  }

}

customElements.define('admin-database-tables-table', AdminDatabaseTablesTable);
