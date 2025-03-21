import { LitElement } from 'lit';
import {render, styles, renderRemoveUserConfirmation} from "./admin-database-user-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';

export default class AdminDatabaseUserTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      users: {type: Array},
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
    this.users = [];
    this._setBulkActions();
    this.selectedBulkAction = '';

    const ctlOptions = {
      searchProps: ['name'],
      filters: [
        {id: 'db-access', cb: this._onDbAccessFilterChange}
      ]
    }
    this.tableCtl = new TableController(this, 'users', ctlOptions);

    this._injectModel('AppStateModel');
  }

  _onDbAccessFilterChange(user, value) {
    if ( !value ) return true;
    if ( value === 'ADMIN') {
      return user?.pgFarmUser?.type === 'ADMIN';
    } else {
      const roleLabel = grantDefinitions.getRoleLabel('DATABASE', user);
      for ( const [role, label] of Object.entries(grantDefinitions.roleLabels) ) {
        if ( roleLabel === label ) return role === value;
      }
    }
  }

  _setBulkActions() {
    this.bulkActions = [
      {value: 'delete', label: 'Delete User'}
    ];
  }

  _onBulkActionSelect() {
    if ( this.selectedBulkAction === 'delete' ) {
      this._showDeleteUserModal(this.tableCtl.getSelectedItems());
    }
  }

  _showDeleteUserModal(user) {
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
