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
import { deleteUserConfirmation, removeSchemaAccess } from '@ucd-lib/pgfarm-client/elements/templates/dialog-modals.js';

/**
 * @description Admin Database User Table
 * @property {String} orgName - The name of the organization
 * @property {String} dbName - The name of the database
 * @property {Array} users - The list of users to display
 * @property {Array} bulkActions - The list of bulk actions available
 * @property {String} selectedBulkAction - The selected bulk action
 * @property {Boolean} rmFromDb - Flag to indicate if the user should be removed from the database or just the schema
 */
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

    this._injectModel('AppStateModel', 'InstanceModel', 'DatabaseModel');
  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.compCtl.parentPageId ) return;
    await this.queryCtl.setFromLocation();
    this._setBulkActions();
  }

  /**
   * @description Callback to determine whether to show user based on db access filter
   * @param {Object} user - The user object from this.users array
   * @param {String} value - The value of the filter
   * @returns {Boolean} - True if the user should be shown, false otherwise
   */
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

  /**
   * @description Callback to determine whether to show user based on schema access filter
   * @param {Object} user - The user object from this.users array
   * @param {String} value - The value of the filter
   * @returns {Boolean} - True if the user should be shown, false otherwise
   */
  _onSchemaAccessFilterChange(user, value) {
    if ( !value ) return true;
    const isThisSchema = value === user?.schemaRole?.grant?.action;
    const isAnySchema = user?.schemaRoles?.some?.(role => role?.grant?.action === value);

    return isThisSchema || isAnySchema;
  }

  /**
   * @description Sets the bulk actions available for the table based on state of component
   */
  _setBulkActions() {
    const bulkActions = [
      {value: 'delete', label: 'Delete user'}
    ];
    if ( this.queryCtl?.schema?.exists?.() ){
      bulkActions.push({value: 'rm-schema-access', label: `Remove access to "${this.queryCtl.schema.value}" schema`});
    }
    this.bulkActions = bulkActions;
  }

  /**
   * @description Callback for when a bulk action is selected by the user
   */
  _onBulkActionSelect() {
    if ( this.selectedBulkAction === 'delete' ) {
      this._showDeleteUserModal(this.tableCtl.getSelectedItems().map(user => user.user));
      return;
    }
    if ( this.selectedBulkAction === 'rm-schema-access' ) {
      const users = this.tableCtl.getSelectedItems().map(user => user.user);
      this.AppStateModel.showDialogModal({
        title: `Remove User Schema Access`,
        actions: [
          {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
          {text: 'Confirm Removal', value: 'db-rm-schema-access', color: 'secondary'}
        ],
        content: removeSchemaAccess(users, this.queryCtl.schema.value),
        data: {user: users}
      });
      return;
    }
  }

  /**
   * @description Callback for when the 'remove' button is clicked for a user
   * @param {Object} user - The user object to remove
   */
  _onRemoveUserButtonClick(user) {
    if ( this.queryCtl?.schema.exists() ){
      this._showRemoveAccessForm(user);
    } else {
      this._showDeleteUserModal(user);
    }
  }

  /**
   * @description Shows the modal for removing access to a schema or the database. User must choose one and confirm.
   * @param {Object} user - The user object to remove access for
   */
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

  /**
   * @description Shows the confirmation modal for deleting a user or users from the database
   * @param {Object|Array} user - The user object or array of user objects to delete
   */
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

  /**
   * @description Callback for when any application dialog action is triggered
   * @param {Object} e - The event object
   * @param {Object} e.action - The action object specified when launching the dialog
   * @param {Object} e.data - The data object specified when launching the dialog
   * @returns
   */
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
      const schema = this.queryCtl.schema.value;
      this.removeSchemaAccess([user.name], schema);
      return;
    }
    if ( e.action?.value === 'db-rm-schema-access' ) {
      const users = (Array.isArray(e.data.user) ? e.data.user : [e.data.user]).map(user => user.name);
      const schema = this.queryCtl.schema.value;
      this.removeSchemaAccess(users, schema);
      return;
    }
  }

  /**
   * @description Removes schema access for a user or users
   * @param {Array} usernames - The array of usernames to remove access for
   * @param {String} schema - The schema to remove access from
   * @returns
   */
  async removeSchemaAccess(usernames, schema) {
    this.AppStateModel.showLoading();
    const r = await this.dataCtl.batchGet(usernames.map(username => ({
      func: () => this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, schema, username, 'NONE'),
      errorMessage: `Unable to remove access to schema '${schema}' for user '${username}'`
    })), {ignoreLoading: true});
    if ( !r ) return;
    const userText = usernames.length === 1 ? `User '${usernames[0]} has'` : `${usernames.length} Users have`;
    this.AppStateModel.showToast({
      text: `${userText} been removed from schema '${schema}'`,
      type: 'success',
      showOnPageLoad: true
    });
    this.tableCtl.reset();
    this.AppStateModel.refresh();
  }


  /**
   * @description Deletes users from the database
   * @param {Array} usernames - The array of usernames to delete
   */
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
