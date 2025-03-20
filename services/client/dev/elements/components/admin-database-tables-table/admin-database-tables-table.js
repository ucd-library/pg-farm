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
