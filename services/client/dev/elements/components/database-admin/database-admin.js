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

    this.loading = {
      metadata : false,
    }

    this.logger = logger('database-admin');

    this._injectModel('AdminModel');
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

    if( ! this.metadata ) {
      this.AdminModel.getDatabaseMetadata(this.view.organization, this.view.database);
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
    if( this.metadata === null ) debugger
    this.logger.info('db metadata', this.metadata);    
  }

  reset() {
    this.users = [];
    this.schemas = [];
    this.tables = [];
    this.tableData = {};
    this.userData = {};
    this.metadata = null;
  }

}

customElements.define('database-admin', DatabaseAdmin);