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
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.tables = [];

    const ctlOptions = {
      searchProps: ['table_name'],
      filters: []
    }
    this.tableCtl = new TableController(this, 'tables', ctlOptions);
  }

}

customElements.define('admin-database-tables-table', AdminDatabaseTablesTable);
