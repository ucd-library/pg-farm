import { LitElement } from 'lit';
import {render, styles} from "./admin-database-user-table-form.tpl.js";

export default class AdminDatabaseUserTableForm extends LitElement {

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

customElements.define('admin-database-user-table-form', AdminDatabaseUserTableForm);