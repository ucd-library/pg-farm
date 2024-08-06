import { LitElement } from 'lit';
import {Mixin} from '@ucd-lib/theme-elements/utils/mixins';

import {render, styles} from "./schema-grant-popup.tpl.js";
import config from '../../../src/config.js';
import logger from '../../../src/logger.js';

export default class SchemaGrantPopup extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      username : {type: String},
      dbName : {type: String},
      schemaName : {type: String},
      tableName : {type: String},
      permissions : {type: Array},
      grantMode : {type: Boolean},
      tableSelect : {type: Array},
      userSelect : {type: Array},
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();

    this.permissions = [];
    this.tableSelect = [];
    this.userSelect = [];
    this.GRANTS = config.grants;
    this.grantMode = null;

    this._injectModel('AdminModel');
    this.logger = logger('schema-grant-popup');

    this.render = render.bind(this);
  }

  firstUpdated() {
    Array.from(this.shadowRoot.querySelectorAll('input[name="grant-permission"]'))
      .forEach(input => {
        input.addEventListener('change', this._onRemoveAccessInputChange.bind(this));
      });
  }

  show(props={}) {
    Array.from(this.shadowRoot.querySelectorAll('input[name="grant-permission"]'))
      .forEach(input => input.checked = false);

    this.grantMode = null;

    // this.shadowRoot.querySelector('#username-input').value = '';

    this.logger.error('Failed to show schema grant popup, missing props', props);

    this.logger.info('Showing schema grant popup', props);

    this.username = props.username;
    this.dbName = props.pathname;
    this.schemaName = props.schema;
    this.tableName = props.table;
    this.tableSelect = props.tables || [];
    this.userSelect = props.users || [];


    // if( ele ) {
    //   if( side === 'left' ) {
    //     this.style.top = ele.offsetTop + 'px';
    //     this.style.right = ele.offsetLeft + 'px';
    //   } else {
    //     this.style.top = ele.offsetTop + 'px';
    //     this.style.left = (ele.offsetLeft + ele.offsetWidth) + 'px';
    //   }
    // }
    this.style.display = 'block';
    document.body.style.overflow = 'hidden';

    this.requestUpdate();
  }

  showRevokeOption() {
    return ((this.username || '').length > 0) && 
      !this.showTableSelect();
  }

  showTableSelect() {
    if( this.tableSelect && this.tableSelect.length > 0 ) {
      return true;
    }
    return false;
  }

  showTableRow() {
    if( this.showTableSelect() || this.tableName ) {
      return true;
    }
    return false;
  }


  hide() {
    this.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  _onRemoveAccessInputChange(e) {
    let checked = this.shadowRoot.querySelector('#grant-permission-remove').checked;
    this.grantMode = !checked;
  }

  _onCloseClicked() {
    this.hide();
  }

  async _onGrantClicked() {
    let permission = (this.shadowRoot.querySelector('input[name="grant-permission"]:checked') || {}).value;
    if( !permission ) {
      return alert('Please select a permission');
    }

    let [org, db] = this.dbName.split('/');
    let schemaTable = this.schemaName;
    
    
    // get schema name and table name if table select is shown
    if( this.tableName ) {
      schemaTable += '.'+this.tableName;
    } else if( this.showTableSelect() ) {
      let value = this.shadowRoot.querySelector('select').value;
      if( !value ) {
        return alert('Please select a table');
      }
      schemaTable += '.'+this.shadowRoot.querySelector('select').value;
    }

    let username = this.username;
    if( !username ) {
      username = this.shadowRoot.querySelector('#user-select').value;
      if( !username ) {
        return alert('Please enter a username');
      }
    }


    let info = {org, db, schemaTable, username, permission};
    this.logger.info('Updating user access', info);

    this.saving = true;
    let resp = await this.AdminModel.setUserAccess(org, db, schemaTable, username, permission);
    this.saving = false;

    this.logger.info('User access updated', info, resp);

    this.dispatchEvent(new CustomEvent('access-updated'));

    this.hide();
  }


}

customElements.define('schema-grant-popup', SchemaGrantPopup);