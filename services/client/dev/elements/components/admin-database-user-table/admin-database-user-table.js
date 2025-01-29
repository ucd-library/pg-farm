import { LitElement } from 'lit';
import {render, styles, renderRemoveUserConfirmation} from "./admin-database-user-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';

export default class AdminDatabaseUserTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      users: {type: Array}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.users = [];

    this.tableCtl = new TableController(this, 'users', {searchProps: ['name']});

    this._injectModel('AppStateModel');
  }

  _onRemoveClick(user){
    this.AppStateModel.showDialogModal({
      title: `Delete User`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Delete User', value: 'db-delete-user', color: 'secondary'}
      ],
      content: renderRemoveUserConfirmation(user),
      data: {user}
    });
  }

}

customElements.define('admin-database-user-table', AdminDatabaseUserTable);
