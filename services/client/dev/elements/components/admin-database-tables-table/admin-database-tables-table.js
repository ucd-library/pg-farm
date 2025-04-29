import { LitElement, html } from 'lit';
import {render, styles} from "./admin-database-tables-table.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import TableController from '@ucd-lib/pgfarm-client/controllers/TableController.js';

import '@ucd-lib/pgfarm-client/elements/components/admin-database-user-table-form/admin-database-user-table-form.js';

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
      searchProps: ['table.table_name'],
      filters: [{id: 'table-access', cb: this._onTableAccessFilterChange}]
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

  _onBulkActionSelect() {
    const action = this.bulkActions.find( a => a.value === this.selectedBulkAction );
    if ( action.showUserAccessForm ) {
      this._showUserAccessForm();
      return;
    }
  }

  _showUserAccessForm(){
    let selectedTables = this.tableCtl.getSelectedItems();

    let modalTitle = this.selectedBulkAction === 'add-users' ? 'Add User to' : 'Remove User from';
    if ( selectedTables.length > 1 ) {
      modalTitle += ` ${selectedTables.length} Tables`;
    } else {
      modalTitle += ` Table: ${selectedTables[0]?.table?.tableName}`;
    }

    const actionText = this.selectedBulkAction === 'add-users' ? 'Add Table Access' : 'Remove Table Access';

    this.AppStateModel.showDialogModal({
      title: modalTitle,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: actionText, value: 'db-edit-table-access', color: 'secondary', disableOnLoading: true}
      ],
      content: html`
        <admin-database-user-table-form
          operation=${this.selectedBulkAction}
          .users=${this.users}
          .tables=${selectedTables.map( t => t.table )}
          >
        </admin-database-user-table-form>`,
      actionCallback: this._onEditAccessModalAction
    });
  }

  _onTableAccessFilterChange(table, value) {
    if ( !value ) return true;
    return table.accessSummary == value;
  }

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
    //if ( r ) this.AppStateModel.refresh();
  }

}

customElements.define('admin-database-tables-table', AdminDatabaseTablesTable);
