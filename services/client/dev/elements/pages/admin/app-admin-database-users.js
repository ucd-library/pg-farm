import { LitElement, html } from 'lit';
import {render, styles} from "./app-admin-database-users.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';
import { publicUserDisableConfirmation, publicUserEnableConfirmation } from '@ucd-lib/pgfarm-client/elements/templates/dialog-modals.js';

import '@ucd-lib/pgfarm-client/elements/components/admin-instance-user-form/admin-instance-user-form.js';

export default class AppAdminDatabaseUsers extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      users: { type: Array },
      publicUserUpdating: { type: Boolean }
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
    this.users = [];
    this.publicUserUpdating = false;

    this.dataCtl = new PageDataController(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.queryCtl = new QueryParamsController(this, [
      {name: 'schema', defaultValue: ''}
    ]);

    this._injectModel('AppStateModel', 'DatabaseModel', 'UserModel', 'InstanceModel');

    // dialog modal calls actionCallback with the modal as 'this'
    this._onPublicUserModalAction = this._onPublicUserModalAction.bind(this);
  }

  /**
     * @description Callback for when the app state is updated
     * @param {Object} e - app state update event
     * @returns
     */
  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    await this.queryCtl.setFromLocation();
    this.orgName = e.location?.path?.[1] || '';
    this.dbName = e.location?.path?.[2] || '';
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

    // get data that requires the database to be awake
    r = await this.dataCtl.get([
      {
        request: this.DatabaseModel.getSchemas(this.orgName, this.dbName),
        ctlProp: 'schemas',
        errorMessage: 'Unable to load schemas'
      },
      {
        request: this.DatabaseModel.getUserAccessOverview(this.orgName, this.dbName),
        ctlProp: 'userAccessOverview',
        errorMessage: 'Unable to load user access overview'
      },
      {
        request: this.UserModel.getMe(),
        ctlProp: 'currentUser',
        errorMessage: 'Unable to load current user'
      }
    ], {ignoreLoading: true});
    if ( !r ) return;

    const selectedSchemas = this.dataCtl.schemas.includes(this.queryCtl.schema.value) ? [this.queryCtl.schema.value] : this.dataCtl.schemas;
    this.users = this.dataCtl.userAccessOverview.map(user => {

      let schemaRole;
      let schemaRoles = [];

      // one schema selected, only need to show access summary to that one
      if ( selectedSchemas.length === 1 ){
        const schemaAccess = user.schemas.find(s => s.name === selectedSchemas[0])?.access || [];
        schemaRole = {
          privileges: schemaAccess,
          grant: grantDefinitions.getGrant('SCHEMA', schemaAccess)
        }
      // multiple schemas selected, If all access the same, show that. Otherwise show 'varies'
      } else {
        schemaRoles = user.schemas.map(s => {
          return {
            schema: s.name,
            privileges: s.access,
            grant: grantDefinitions.getGrant('SCHEMA', s.access)
          }
        });

        const allSame = schemaRoles.every((r, i, arr) => r.grant.action === arr[0].grant.action);
        if ( allSame ){
          schemaRole = {
            privileges: schemaRoles[0].privileges,
            grant: schemaRoles[0].grant
          }
        } else {
          schemaRole = {
            privileges: [],
            grant: {action: 'VARIES', roleLabel: 'Varies' }
          }
        }
      }

      return {
        user,
        schemaRole,
        schemaRoles,
        tableCt: user.tableAccessCount
      }
    });

    this.AppStateModel.hideLoading();
  }

  showAddUserModal() {
    this.AppStateModel.showDialogModal({
      title: 'Add New User',
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Add User', value: 'db-add-user', color: 'secondary', disableOnLoading: true}
      ],
      content: html`
        <admin-instance-user-form
          .orgName=${this.orgName}
          .dbName=${this.dbName}
          .instanceName=${this.dataCtl?.db?.instance?.name}>
        </admin-instance-user-form>`,
      actionCallback: this._onAddUserModalAction
    });
  }

  /**
   * @description Is the instance public user enabled
   * @returns {Boolean}
   */
  get publicUserEnabled() {
    return this.dataCtl?.db?.instance?.publicUserEnabled === true;
  }

  /**
   * @description Click handler for the public user checkbox.  Prevents the checkbox from
   * changing and opens a confirmation dialog.  The checkbox reflects the server state after
   * the change is confirmed and the page is refreshed.
   * @param {Event} e - click event
   */
  async _onPublicUserToggleClick(e) {
    e.preventDefault();
    if ( this.publicUserUpdating ) return;
    const instanceName = this.dataCtl?.db?.instance?.name;
    const username = window.APP_CONFIG?.publicUser?.username || 'pgfarm-public';

    if ( this.publicUserEnabled ) {
      // get the current permission summary so we can show what will be removed
      this.publicUserUpdating = true;
      this.AppStateModel.showLoading();
      const r = await this.InstanceModel.disablePublicUser(this.orgName, instanceName, {dryRun: true});
      this.AppStateModel.hideLoading();
      this.publicUserUpdating = false;
      if ( r.state === 'error' ) {
        this.AppStateModel.showError({
          message: 'Unable to load public user permissions',
          error: r.error
        });
        return;
      }

      this.AppStateModel.showDialogModal({
        title: 'Disable Public User',
        actions: [
          {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
          {text: 'Disable Public User', value: 'db-disable-public-user', color: 'secondary', disableOnLoading: true}
        ],
        content: publicUserDisableConfirmation(r.payload?.summary, instanceName),
        actionCallback: this._onPublicUserModalAction
      });
      return;
    }

    this.AppStateModel.showDialogModal({
      title: 'Enable Public User',
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Enable Public User', value: 'db-enable-public-user', color: 'secondary', disableOnLoading: true}
      ],
      content: publicUserEnableConfirmation(instanceName, username),
      actionCallback: this._onPublicUserModalAction
    });
  }

  /**
   * @description Callback for the enable/disable public user dialog actions
   * @param {String} action - dialog action value
   * @param {Object} modalEle - dialog modal element
   */
  async _onPublicUserModalAction(action, modalEle) {
    if ( action !== 'db-disable-public-user' && action !== 'db-enable-public-user' ) return;
    const enable = action === 'db-enable-public-user';
    const instanceName = this.dataCtl?.db?.instance?.name;

    modalEle._loading = true;
    this.publicUserUpdating = true;
    const r = enable ?
      await this.InstanceModel.enablePublicUser(this.orgName, instanceName) :
      await this.InstanceModel.disablePublicUser(this.orgName, instanceName);
    modalEle._loading = false;
    this.publicUserUpdating = false;

    if ( r.state === 'error' ) {
      this.AppStateModel.showError({
        message: `Unable to ${enable ? 'enable' : 'disable'} public user`,
        error: r.error
      });
      return;
    }

    if ( r.payload?.errors?.length ) {
      this.AppStateModel.showError({
        message: `Public user ${enable ? 'enabled' : 'disabled'} with errors: ` +
          r.payload.errors.map(e => `${e.database ? e.database + ' ' : ''}${e.step}: ${e.message}`).join('; ')
      });
    } else {
      this.AppStateModel.showToast({
        text: `Public user has been ${enable ? 'enabled' : 'disabled'} for instance ${instanceName}`,
        type: 'success',
        showOnPageLoad: true
      });
    }
    this.AppStateModel.refresh();
  }

  async _onAddUserModalAction(action, modalEle) {
    if ( action === 'db-add-user' ) {
      const form = modalEle.renderRoot.querySelector('admin-instance-user-form');
      if ( !form.reportValidity() ) return {abortModalAction: true};
      modalEle._loading = true;
      const r = await form.submit();
      modalEle._loading = false;
      form.payload = {};
      if ( r ) this.AppStateModel.refresh();
    }
  }

}

customElements.define('app-admin-database-users', AppAdminDatabaseUsers);
