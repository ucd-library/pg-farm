import { LitElement, html } from 'lit';
import {render, styles} from "./admin-database-tables-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';

import '@ucd-lib/pgfarm-client/elements/components/admin-database-user-table-form/admin-database-user-table-form.js';

/**
 * @description Table component for displaying database tables
 * @property {Array} tables - list of database tables
 * @property {Array} users - list of database users
 * @property {Array} bulkActions - list of bulk actions available for the table
 * @property {String} selectedBulkAction - selected bulk action value from bulkActions array
 */
export default class AdminDatabaseTablesTable extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {


  static get properties() {
    return {
      tables: {type: Array},
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
    this.tables = [];
    this.users = [];
    this.bulkActions = [
      {value: 'add-users', label: 'Add Users', showUserAccessForm: true},
      {value: 'remove-users', label: 'Remove Users', showUserAccessForm: true}
    ];
    this.selectedBulkAction = '';

    const ctlOptions = {
      searchProps: ['table.tableName'],
      filters: [
        {id: 'table-access', cb: this._onTableAccessFilterChange},
        {id: 'table-type', cb: (table, value) => {
          if ( !value ) return true;
          return table?.table?.tableType === value;
        }}
      ]
    }
    this.tableCtl = new TableController(this, 'tables', ctlOptions);

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

  /**
   * @description Callback for when a user applies a bulk action
   * @returns
   */
  _onBulkActionSelect() {
    const action = this.bulkActions.find( a => a.value === this.selectedBulkAction );
    if ( action.showUserAccessForm ) {
      this._showUserAccessForm();
      return;
    }
  }

  /**
   * @description Callback for when a user clicks the remove button on a table
   * @param {Object} table - An item from this.tables
   */
  _onSingleRemoveClick(table){
    const users = this.users.filter( u => table.table.userAccess.includes(u.name) );
    this._showUserAccessForm('remove-users', [table], users);
  }

  /**
   * @description Shows the user access form modal
   * @param {String} operation - The operation to perform (add-users or remove-users)
   * @param {Array} tables - Tables to apply the operation to. Will be items from this.tables
   * @param {Array} users - Users to apply the operation to. Will be items from this.users
   */
  _showUserAccessForm(operation, tables, users){
    operation = operation || this.selectedBulkAction;
    tables = tables || this.tableCtl.getSelectedItems();
    users = users || this.users;

    let modalTitle = operation === 'add-users' ? 'Add User to' : 'Remove User from';
    if ( tables.length > 1 ) {
      modalTitle += ` ${tables.length} Tables`;
    } else {
      modalTitle += ` Table: ${tables[0]?.table?.tableName}`;
    }

    const actionText = operation === 'add-users' ? 'Add Table Access' : 'Remove Table Access';
    this.AppStateModel.showDialogModal({
      title: modalTitle,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: actionText, value: 'db-edit-table-access', color: 'secondary', disableOnLoading: true}
      ],
      content: html`
        <admin-database-user-table-form
          operation=${operation}
          .users=${users}
          .tables=${tables.map( t => t.table )}
          >
        </admin-database-user-table-form>`,
      actionCallback: this._onEditAccessModalAction.bind(this)
    });
  }

  /**
   * @description Callback for table controller hook when the access filter is changed
   * @param {Object} table - The table object - from this.tables
   * @param {String} value - The current value of the filter
   * @returns {Boolean} - true if the row should be shown, false otherwise
   */
  _onTableAccessFilterChange(table, value) {
    if ( !value ) return true;
    return table.accessSummary == value;
  }

  /**
   * @description Callback for when the user clicks a modal action on the user access form
   * @param {String} action - The action value from the modal
   * @param {Element} modalEle - The modal element
   * @returns
   */
  async _onEditAccessModalAction(action, modalEle) {
    const form = modalEle.renderRoot.querySelector('admin-database-user-table-form');
    if ( action === 'dismiss' ){
      form.reset();
      return;
    }

    if ( !form.reportValidity() ) return {abortModalAction: true};
    modalEle._loading = true;
    const r = await form.submit();
    modalEle._loading = false;
    form.reset();
    if ( r ) {
      this.AppStateModel.refresh();
      this.tableCtl.reset();
    }
  }

}

customElements.define('admin-database-tables-table', AdminDatabaseTablesTable);
