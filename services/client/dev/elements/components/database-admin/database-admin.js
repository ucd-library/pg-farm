import { LitElement } from 'lit';
import {render, styles} from "./database-admin.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import logger from '../../../src/logger.js';
import "./database-grant.js";
import "../schema-grant-popup/schema-grant-popup.js";

export default class DatabaseAdmin extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      view : {type: Object},
      metadata : {type: Object},
      loading : {type: Object},
      users : {type: Array},
      schemas : {type: Array},
      tables : {type: Array},
      tableData : {type: Array},
      userData : {type: Object},
      startingInstance : {type: Boolean}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();

    this.rendered = {};
    this.view = {};
    this.render = render.bind(this);

    this.reset();
    this.logger = logger('database-admin');

    this.grantPopup = document.createElement('schema-grant-popup');
    document.body.appendChild(this.grantPopup);
    this.grantPopup.addEventListener('access-updated', e => this._onAccessUpdated(e));

    this._injectModel('AdminModel', 'AppStateModel');
  }

  reset() {
    this.users = [];
    this.schemas = [];
    this.tables = [];
    this.tableData = [];
    this.userData = {};
    this.metadata = null;
    this.startingInstance = false;
    this.rendered = {};
    this.loading = {
      metadata : false,
      users : false,
      schemas : false
    }
  }

  updated(changedProperties) {
    if( changedProperties.has('view') ) {
      this._onViewUpdate();
    }
  }

  async _onViewUpdate() {
    if( Object.keys(this.view).length === 0 ) return;

    if( this.rendered.database !== this.view.database ||
        this.rendered.organization !== this.view.organization ) {

      this.logger.debug('Resetting entire database view', this.view);

      this.reset();

      this.rendered.database = this.view.database;
      this.rendered.organization = this.view.organization;
    }

    // check if we need to load the main database metadata
    if( ! this.metadata ) {
      this.AdminModel.getDatabaseMetadata(this.view.organization, this.view.database);
    }


    // if no subpage, we are done
    if( !this.view.subPage ) return;

    // load root subpage data
    if( this.view.schema !== this.rendered.schema ) {
      this.AdminModel.getSchemaTables(this.view.organization, this.view.database, this.view.schema);
    }
    this.rendered.schema = this.view.schema;

    if( this.view.subPage === 'user' ) {
      if( this.rendered.subPageValue !== this.view.subPageValue ) {
        this.AdminModel.getTableAccessByUser(this.view.organization, this.view.database, this.view.schema, this.view.subPageValue);
      }
    } else if( this.view.subPage === 'table' ) {
      if( this.rendered.subPageValue !== this.view.subPageValue ) {
        this.AdminModel.getTableAccess(this.view.organization, this.view.database, this.view.schema, this.view.subPageValue);
      }
    }
    this.rendered.subPage = this.view.subPage;
    this.rendered.subPageValue = this.view.subPageValue;
  }

  /**
   * @method _onAccessUpdated
   * @description triggered from schema-grant-popup when access is updated
   * 
   * @param {Event} e 
   */
  _onAccessUpdated(e) {
    if( this.view.subPage === 'user' ) {
      this.AdminModel.getTableAccessByUser(this.view.organization, this.view.database, this.view.schema, this.view.subPageValue);
    } else if( this.view.subPage === 'table' ) {
      this.AdminModel.getTableAccess(this.view.organization, this.view.database, this.view.schema, this.view.subPageValue);
    }
  }

  _onDatabaseMetadataUpdate(e) {
    if( e.database !== this.view.database || e.organization !== this.view.organization ) {
      return;
    }

    if( e.state === 'loading' ) {
      this.loading.metadata = true;
      return;
    }
    this.loading.metadata = false;

    this.metadata = e.payload;
    this.logger.info('db metadata', this.metadata);   

    if( !this.metadata?.isAdmin ) {
      this.style.display = 'none';
      return;
    }
    this.style.display = 'block';

    if( this.metadata.instance.state !== 'RUN' ) {
      return;
    }

    this.AdminModel.getDatabaseUsers(this.view.organization, this.view.database);
    this.AdminModel.getDatabaseSchemas(this.view.organization, this.view.database);
  }

  _onDatabaseUsersUpdate(e) { 
    if( e.database !== this.view.database || e.organization !== this.view.organization ) {
      return;
    }

    if( e.state === 'loading' ) {
      this.loading.users = true;
      return;
    }
    this.loading.users = false;

    this.users = e.payload;
    this.logger.info('db users', this.users);
  }

  _onDatabaseSchemasUpdate(e) {
    if( e.database !== this.view.database || e.organization !== this.view.organization ) {
      return;
    }

    if( e.state === 'loading' ) {
      this.loading.schemas = true;
      return;
    }
    this.loading.schemas = false;


    this.schemas = e.payload;
    this.logger.info('db schemas', this.schemas);   
  }

  _onSchemaTablesUpdate(e) {
    if( e.database !== this.view.database || e.organization !== this.view.organization ) {
      return;
    } else if( e.state === 'loading' ) {
      this.loading.tables = true;
      return;
    } else if( e.schema !== this.view.schema ) {
      return;
    }

    this.tables = e.payload;
    this.logger.info('db schema tables', this.tables);   
  }

  _onTableAccessByUserUpdate(e) {
    if( e.database !== this.view.database || e.organization !== this.view.organization  ) {
      return;
    } else if( e.state === 'loading' ) {
      this.loading.tableData = true;
      return;
    } else if ( e.user !== this.view.subPageValue ) {
      return;
    }

    let view = Object.assign({}, e.payload);
    view.tables = [];
    for( let table in e.payload.tables ) {
      view.tables.push({
        name: table,
        access : e.payload.tables[table]
      });
    }

    view.tables.sort((a,b) => a.name.localeCompare(b.name));

    this.userData = view;

    this.userData.databasePrivileges = this.users.find(u => u.name === this.view.subPageValue)?.access || [];

    this.logger.info('user table data', this.userData);   
  }

  _onTableAccessUpdate(e) {
    if( e.database !== this.view.database || e.organization !== this.view.organization ) {
      return;
    } else if( e.state === 'loading' ) {
      this.loading.tableData = true;
      return;
    } else if ( e.table !== this.view.subPageValue ) {
      return;
    }

    let view = [];
    for( let user in e.payload ) {
      view.push({
        name: user,
        access : e.payload[user]
      });
    }
    view.sort((a, b) => a.name.localeCompare(b.name));

    this.tableData = view;
    this.logger.info('table data', this.tableData);   
  }

  async _onWakeUpBtnClick() {
    this.startingInstance = true;
    await this.AdminModel.startInstance(this.view.organization, this.view.database);
    this.startingInstance = false;

    this.AdminModel.getDatabaseMetadata(this.view.organization, this.view.database);
  }

  _onSchemaSelectChange(e) {
    this.AppStateModel.setLocation(e.currentTarget.value);
  }

  _onUserSelectChange(e) {
    this.AppStateModel.setLocation(e.currentTarget.value);
  }

  _onEditUserTableAccessClick(e) {
    let editProps = {
      pathname : this.metadata.pathname,
      schema : this.view.schema,
    };

    let table = null;
    if( this.view.subPage === 'table' ) {
      table = this.view.subPageValue;
    } else if ( e.currentTarget.getAttribute('table') ) {
      table = e.currentTarget.getAttribute('table');
    }

    if( table ) {
      editProps.table = table;
    } else if( e.currentTarget.getAttribute('select-table') != null ) {
      editProps.tables = this.tables;
    }

    let user = null;
    if( this.view.subPage === 'user' ) {
      user = this.view.subPageValue;
    } else if ( e.currentTarget.getAttribute('user') ) {
      user = e.currentTarget.getAttribute('user');
    }

    if( user ) {
      editProps.username = user;
    } else if( e.currentTarget.getAttribute('select-user') != null ) {
      editProps.users = this.users;
    }

    this.grantPopup.show(editProps, e.currentTarget);
  }

}

customElements.define('database-admin', DatabaseAdmin);