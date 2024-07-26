import { LitElement } from 'lit';
import {render, styles} from "./database-admin.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import logger from '../../../src/logger.js';

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
      tableData : {type: Object},
      userData : {type: Object},
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();

    this.rendered = {};
    this.render = render.bind(this);

    this.reset();
    this.logger = logger('database-admin');

    this._injectModel('AdminModel', 'AppStateModel');
  }

  reset() {
    this.users = [];
    this.schemas = [];
    this.tables = [];
    this.tableData = {};
    this.userData = {};
    this.metadata = null;
    this.startingInstance = false;
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

    if( this.view.schema && !this.tables.length ) {
      this.AdminModel.getSchemaTables(this.view.organization, this.view.database, this.view.schema);
    }

    // if no subpage, we are done
    if( !this.view.subPage ) return;

    // load root subpage data
    if( this.view.subPage === 'user' ) {
      this.AdminModel.getTableAccessByUser(this.view.organization, this.view.database, this.view.schema, this.view.subPageValue);
    } else {
      this.AdminModel.getSchemaTables(this.view.organization, this.view.database, this.view.subPageValue);
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
    this.logger.info('user table data', this.userData);   
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

}

customElements.define('database-admin', DatabaseAdmin);