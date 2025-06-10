import { LitElement, html } from 'lit';
import {render, styles} from "./app-admin-database-users.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import { grantDefinitions } from '@ucd-lib/pgfarm-client/utils/service-lib.js';

import '@ucd-lib/pgfarm-client/elements/components/admin-instance-user-form/admin-instance-user-form.js';

export default class AppAdminDatabaseUsers extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      orgName: { type: String},
      dbName: { type: String},
      users: { type: Array }
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

    this.dataCtl = new PageDataController(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.queryCtl = new QueryParamsController(this, [
      {name: 'schema', defaultValue: ''}
    ]);

    this._injectModel('AppStateModel', 'DatabaseModel');
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
