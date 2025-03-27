import { LitElement } from 'lit';
import {render, styles} from "./admin-database-user-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';
import { deleteUserConfirmation } from '@ucd-lib/pgfarm-client/elements/templates/dialog-modals.js';

export default class AdminDatabaseUserTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      users: {type: Array},
      bulkActions: {type: Array},
      selectedBulkAction: {type: String},
      orgName: { type: String},
      dbName: { type: String}
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

    const ctlOptions = {
      searchProps: ['user.name', 'user.pgFarmUser.firstName', 'user.pgFarmUser.lastName'],
      filters: [
        {id: 'db-access', cb: this._onDbAccessFilterChange},
        {id: 'schema-access', cb: this._onSchemaAccessFilterChange}
      ]
    }
    this.tableCtl = new TableController(this, 'users', ctlOptions);

    this._injectModel('AppStateModel', 'InstanceModel');
  }

  _onDbAccessFilterChange(user, value) {
    if ( !value ) return true;
    if ( value === 'ADMIN') {
      return user?.user?.pgFarmUser?.type === 'ADMIN';
    } else {
      const roleLabel = grantDefinitions.getRoleLabel('DATABASE', user.user);
      for ( const [role, label] of Object.entries(grantDefinitions.roleLabels) ) {
        if ( roleLabel === label ) return role === value;
      }
    }
  }

  _onSchemaAccessFilterChange(user, value) {
    if ( !value ) return true;
    const isThisSchema = value === user?.schemaRole?.grant?.action;
    const isAnySchema = user?.schemaRoles?.some?.(role => role?.grant?.action === value);

    return isThisSchema || isAnySchema;
  }

  _setBulkActions() {
    this.bulkActions = [
      {value: 'delete', label: 'Delete User'}
    ];
  }

  _onBulkActionSelect() {
    if ( this.selectedBulkAction === 'delete' ) {
      this._showDeleteUserModal(this.tableCtl.getSelectedItems().map(user => user.user));
    }
  }

  _showDeleteUserModal(user) {
    this.AppStateModel.showDialogModal({
      title: `Delete User`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Delete User', value: 'db-delete-users', color: 'secondary'}
      ],
      content: deleteUserConfirmation(user),
      data: {user}
    });
  }

  _onAppDialogAction(e){
    if ( e.action?.value === 'db-delete-users' ) {
      const users = (Array.isArray(e.data.user) ? e.data.user : [e.data.user]).map(user => user.name);
      this.deleteUsers(users);
    }
  }


  async deleteUsers(usernames) {
    this.AppStateModel.showLoading();
    const r = await this.dataCtl.batchGet(usernames.map(username => ({
      func: () => this.InstanceModel.deleteUser(this.orgName, this.dbName, username),
      errorMessage: `Unable to delete user '${username}'`
    })), {ignoreLoading: true});
    if ( !r ) return;
    this.AppStateModel.showToast({
      text: usernames.length === 1 ? `User '${usernames[0]}' has been deleted from the database` : `${usernames.length} Users have been deleted from the database`,
      type: 'success',
      showOnPageLoad: true
    });
    this.tableCtl.reset();
    this.AppStateModel.refresh();
  }

}

customElements.define('admin-database-user-table', AdminDatabaseUserTable);
