import { LitElement } from 'lit';
import {render, styles} from "./database-grant.tpl.js";
import {Mixin} from '@ucd-lib/theme-elements/utils/mixins';
import logger from '../../../src/logger.js';

export default class DatabaseGrant extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      database : {type: Object},
      user : {type: String},
      currentUsers : {type: Array},
      databasePrivileges : {type: Array},
      table : {type: String},
      schema : {type: String},
      options : {type: Array},
      view : {type: String},
      userInDb : {type: Boolean}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.logger = logger('database-grant');

    this.database = {};
    this.databaseAccess = [];
    this.currentUsers = [];
    this.userInDb = false;


    this.render = render.bind(this);
    this.options = [
      {
        label : 'Read/Write Access',
        value : 'ALL'
      },{
        label : 'Read Access',
        value : 'SELECT'
      },{
        label : 'Remove Access',
        value : 'NONE'
      }];

    this._injectModel('AdminModel');
  }

  async show(props={}) {
    this.logger.info('editing', props);

    this.database = props.database || {};
    this.user = props.user;
    this.table = props.table;
    this.schema = props.schema;
    this.currentUsers = props.users || [];

    this.setUserInDb();

    this.shadowRoot.querySelector('input').value = this.user || '';

    if( this.table ) {
      this.view = 'table';
    } else {
      this.view = 'schema';
    }

    this.style.display = 'block';
  }

  hide() {
    this.style.display = 'none';
  }

  _onCloseBtnClick() {
    this.hide();
  }

  _onUsernameKeyup(e) {
    this.user = e.target.value;
    this.setUserInDb();

    // TODO:
    return;

    if( this.loadUserDataTimeout ) {
      clearTimeout(this.loadUserDataTimeout);
    }

    this.loadUserDataTimeout = setTimeout(() => {
      this.loadUserDataTimeout = null;
      this.loadUserData();
    }, 500);
  }

  async loadUserData() {
    this.userData = await this.AppStateModel.getUserData(this.username);
  }

  setUserInDb() {
    this.userInDb = this.currentUsers.find(u => u.name === this.user) ? true : false;
  }


  async apply() {
    this.logger.info('applying', this.user, this.table, this.schema);
    
    let grantType = this.shadowRoot.querySelector('select').value;

    let schemaTable = this.schema;
    if( this.table ) {
      schemaTable += '.'+this.table;
    }

    let resp = await this.AdminModel.grantTableAccess(
      this.database.organization_name,
      this.database.database_name,
      schemaTable,
      this.user,
      grantType
    );
  }


}

customElements.define('database-grant', DatabaseGrant);