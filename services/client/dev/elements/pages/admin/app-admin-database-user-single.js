import { LitElement, html } from 'lit';
import {render, styles} from "./app-admin-database-user-single.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';
import { deleteUserConfirmation } from '@ucd-lib/pgfarm-client/elements/templates/dialog-modals.js';

import '@ucd-lib/pgfarm-client/elements/components/admin-instance-user-form/admin-instance-user-form.js';

export default class AppAdminDatabaseUserSingle extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      username: { type: String },
      user: { type: Object },
      schemaGrant: { type: Object },
      tables: { type: Array },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.orgName = '';
    this.dbName = '';
    this.username = '';
    this.user = {};
    this.schemaGrant = {};
    this.tables = [];

    this.dataCtl = new PageDataController(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.queryCtl = new QueryParamsController(this, [
      {name: 'schema', defaultValue: ''}
    ]);

    this._injectModel('AppStateModel', 'DatabaseModel', 'InstanceModel');
  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    await this.queryCtl.setFromLocation();
    this.orgName = e.location?.path?.[1] || '';
    this.dbName = e.location?.path?.[2] || '';
    this.username = e.location?.path?.[5] || '';
    this.tables = [];
    this.AppStateModel.showLoading();
    let r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.isAdmin(this.orgName, this.dbName),
        ctlProp: 'isAdmin',
        errorMessage: 'You do not have permission to view this page'
      },
      {
        request: this.DatabaseModel.get(this.orgName, this.dbName),
        ctlProp: 'db',
        errorMessage: 'Unable to load database'
      },
    ], {ignoreLoading: true});
    if ( !r ) return;

    if ( this.dataCtl?.db?.instance?.state === 'SLEEP' ) {
      this.AppStateModel.hideLoading();
      return;
    }

    r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.getUsers(this.orgName, this.dbName),
        ctlProp: 'users',
        errorMessage: 'Unable to get database users'
      },
      {
        request: this.DatabaseModel.getSchemas(this.orgName, this.dbName),
        ctlProp: 'schemas',
        errorMessage: 'Unable to load schemas'
      },
    ], {ignoreLoading: true});
    if ( !r ) return;

    const user = this.dataCtl.users.find(user => user.name === this.username);
    if ( !user ) {
      this.AppStateModel.showError({message: `User '${this.username}' does not have access to this database`});
      return;
    }
    this._setUser(user);

    // Get schema and table access for selected schema
    if ( this.queryCtl.schema.exists() ){
      r = await this.dataCtl.get([
        {
          request: this.DatabaseModel.getSchemaUserAccess(this.orgName, this.dbName, this.queryCtl.schema.value, this.username),
          ctlProp: 'schemaAccess',
          errorMessage: 'Unable to get schema access'

        },
        {
          request: this.DatabaseModel.getSchemaTables(this.orgName, this.dbName, this.queryCtl.schema.value),
          ctlProp: 'schemaTables',
          errorMessage: 'Unable to get schema tables'
        }
      ], {ignoreLoading: true});
      if ( !r ) return;
    }
    this.schemaGrant = grantDefinitions.getGrant('SCHEMA', this.dataCtl?.schemaAccess?.schema);
    this.tables = (this.dataCtl?.schemaTables || []).map(table => {
      const roles = [...(this.dataCtl?.schemaAccess?.tables?.[table.table_name	] || [])];
      const grant = grantDefinitions.getGrant('TABLE', roles);
      return { table: {...table}, grant, roles };
    });

    this.AppStateModel.hideLoading();
  }

  _setUser(data) {
    const user = {
      isAdmin: data?.pgFarmUser?.type === 'ADMIN',
      displayName: `${data?.pgFarmUser?.firstName || ''} ${data?.pgFarmUser?.lastName || ''}`.trim(),
      databaseGrant: grantDefinitions.getGrant('DATABASE', data),
      data
    };
    user.positions = (data?.pgFarmUser?.ucdPositions || [])
      .map(listing => [listing?.title, listing?.dept].filter(x => x).join(', '))
      .filter(x => x);
    user.showContactSection = user.displayName || user.positions.length ? true : false;

    this.user = user;
  }

  _showDeleteUserModal(user) {
    if ( !user ) {
      user = this.user.data;
    }
    this.AppStateModel.showDialogModal({
      title: `Delete User`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Delete User', value: 'db-delete-user', color: 'secondary'}
      ],
      content: deleteUserConfirmation(user),
      data: {user}
    });
  }

  _showEditUserModal() {
    const payload = {
      username: this.user.data.name,
      admin: this.user.isAdmin,
      access: this.user.databaseGrant.action,
    };
    this.AppStateModel.showDialogModal({
      title: 'Edit User',
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Save Changes', value: 'db-edit-user', color: 'secondary', disableOnLoading: true}
      ],
      content: html`
        <admin-instance-user-form
          .orgName=${this.orgName}
          .dbName=${this.dbName}
          .instanceName=${this.dataCtl?.db?.instance?.name}
          operation='update'
          .payload=${payload}
          >
        </admin-instance-user-form>`,
      actionCallback: this._onEditUserModalAction
    });
  }

  _showEditSchemaUserModal() {
    const payload = {
      username: this.user.data.name,
      access: this.schemaGrant.action,
    }
    this.AppStateModel.showDialogModal({
      title: 'Change Schema Access',
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Apply Access', value: 'db-edit-user-schema-access', color: 'secondary', disableOnLoading: true}
      ],
      content: html`
        <admin-instance-user-form
          .orgName=${this.orgName}
          .dbName=${this.dbName}
          .instanceName=${this.dataCtl?.db?.instance?.name}
          operation='update-schema'
          .payload=${payload}
          .schema=${this.queryCtl.schema.value}
          >
        </admin-instance-user-form>`,
      actionCallback: this._onEditUserModalAction
    });
  }

  async _onEditUserModalAction(action, modalEle) {
    if ( action === 'dismiss' ){
      return;
    }
    const form = modalEle.renderRoot.querySelector('admin-instance-user-form');
    if ( !form.reportValidity() ) return {abortModalAction: true};
    modalEle._loading = true;
    const r = await form.submit();
    modalEle._loading = false;
    form.payload = {};
    if ( r ) this.AppStateModel.refresh();
  }

  _onAppDialogAction(e){
    if ( e.action?.value === 'db-delete-user' ) {
      this.deleteUser();
    }
  }

  async deleteUser() {
    this.AppStateModel.showLoading();
    const r = await this.dataCtl.get([
      {
        request: this.InstanceModel.deleteUser(this.orgName, this.dbName, this.username),
        errorMessage: `Unable to delete user '${this.username}'`
      }
    ], {ignoreLoading: true});
    if ( !r ) return;
    this.AppStateModel.showToast({
      text: `User '${this.username}' has been deleted from the database`,
      type: 'success',
      showOnPageLoad: true
    });
    this.AppStateModel.setLocation(`/db/${this.orgName}/${this.dbName}/edit/users`);
  }

}

customElements.define('app-admin-database-user-single', AppAdminDatabaseUserSingle);
