import { LitElement } from 'lit';
import {render, styles} from "./admin-database-user-schema-tables-table.tpl.js";

export default class AdminDatabaseUserSchemaTablesTable extends LitElement {

  static get properties() {
    return {
      
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
  }

}

customElements.define('admin-database-user-schema-tables-table', AdminDatabaseUserSchemaTablesTable);