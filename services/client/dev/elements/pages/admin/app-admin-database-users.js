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

    // get schema access
    const selectedSchemas = this.dataCtl.schemas.includes(this.queryCtl.schema.value) ? [this.queryCtl.schema.value] : this.dataCtl.schemas;
    const userSchemaProduct = selectedSchemas.flatMap(schema =>
      this.dataCtl.users.map(user => ({ schema, user: user.name }))
    );
    const schemaAccess = await this.dataCtl.batchGet(userSchemaProduct.map(({ schema, user }) => ({
      func: () => this.DatabaseModel.getSchemaUserAccess(this.orgName, this.dbName, schema, user),
      errorMessage: `Unable to get access for user ${user} on schema ${schema}`
    })), {ignoreLoading: true});
    if ( !schemaAccess ) return;

    // merge it all together
    this.users = this.dataCtl.users.map(user => {
      const access = schemaAccess.filter(r => r.response?.value?.user === user.name).map(r => r.response.value);

      // count tables only when they have access permissions (table will be empty array if no access)
      const tableCt = access.reduce((acc, r) => {
        const tables = r.payload.tables;
        const count = Object.values(tables).filter(arr => Array.isArray(arr) && arr.length > 0).length;
        return acc + count;
      }, 0);

      let schemaRole;
      let schemaRoles = [];
      if ( access.length ){

        // one schema selected, only need to show access summary to that one
        if ( selectedSchemas.length === 1 ){
          schemaRole = {
            privileges: access[0].payload?.schema,
            grant: grantDefinitions.getGrant('SCHEMA', access[0].payload?.schema)
          }

        // multiple schemas selected, If all access the same, show that. Otherwise show 'varies'
        } else {
          schemaRoles = access.map(r => ({
            schema: r.payload?.schema,
            privileges: r.payload?.schema,
            grant: grantDefinitions.getGrant('SCHEMA', r.payload?.schema)
          }));

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
      }

      return {
        user,
        tableCt,
        schemaRole,
        schemaRoles
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
