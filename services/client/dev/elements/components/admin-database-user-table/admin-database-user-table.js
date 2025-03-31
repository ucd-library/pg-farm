import { LitElement } from 'lit';
import {render, styles, renderRmAccessForm} from "./admin-database-user-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import AppComponentController from '@ucd-lib/pgfarm-client/controllers/AppComponentController.js';
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
      dbName: { type: String},
      rmFromDb: { type: Boolean }
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
    this.rmFromDb = false;

    this.dataCtl = new PageDataController(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.queryCtl = new QueryParamsController(this, [
      {name: 'schema', defaultValue: ''}
    ]);
    this.compCtl = new AppComponentController(this);

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

  async _onAppStateUpdate(e){
    if ( e.page !== this.compCtl.parentPageId ) return;
    await this.queryCtl.setFromLocation();
    this._setBulkActions();
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
    const bulkActions = [
      {value: 'delete', label: 'Delete user'}
    ];
    if ( this.queryCtl?.schema?.exists?.() ){
      bulkActions.push({value: 'rm-schema-access', label: `Remove access to "${this.queryCtl.schema.value}" schema`});
    }
    this.bulkActions = bulkActions;
  }

  _onBulkActionSelect() {
    if ( this.selectedBulkAction === 'delete' ) {
      this._showDeleteUserModal(this.tableCtl.getSelectedItems().map(user => user.user));
    }
  }

  _onRemoveUserButtonClick(user) {
    if ( this.queryCtl?.schema.exists() ){
      this._showRemoveAccessForm(user);
    } else {
      this._showDeleteUserModal(user);
    }
  }

  _showRemoveAccessForm(user){
    this.AppStateModel.showDialogModal({
      title: 'Remove User Access',
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Confirm Removal', value: 'db-remove-single-user-access', color: 'secondary'}
      ],
      content: renderRmAccessForm.call(this, user),
      data: {user}
    });
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
    if (
      e.action?.value === 'db-delete-users' ||
      (e.action?.value === 'db-remove-single-user-access' && this.rmFromDb)
    ) {
      const users = (Array.isArray(e.data.user) ? e.data.user : [e.data.user]).map(user => user.name);
      this.deleteUsers(users);
      return;
    }
    if ( e.action?.value === 'db-remove-single-user-access' ) {
      const user = e.data.user;
      console.log(user);
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
