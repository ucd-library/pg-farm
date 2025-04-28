import { LitElement } from 'lit';
import {render, styles} from "./admin-database-user-table-form.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';
import AppComponentController from '@ucd-lib/pgfarm-client/controllers/AppComponentController.js';

export default class AdminDatabaseUserTableForm extends Mixin(LitElement)
.with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      operation: { type: String },
      users: { type: Array },
      tables: { type: Array },
      permission: { type: String },
      userOptions: { state: true },
      selectedUsers: { type: Array },
      customValidations: { type: Array }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.operation = '';
    this.users = [];
    this.tables = [];
    this.reset();

    this.idGen = new IdGenerator({randomPrefix: true});
    this.compCtl = new AppComponentController(this);
  }

  willUpdate(props){
    if (props.has('users') ){
      this._setUserOptions();
    }
  }

  reset(){
    this._setUserOptions();
    this.selectedUsers = [];
    this.permission = '';
    this.customValidations = [];
  }

  reportValidity(){
    let nativeValidation = this.renderRoot.querySelector('form').reportValidity();

    const customValidations = [];
    if ( !this.selectedUsers.length ){
      customValidations.push({
        message: 'Please select at least one user'
      });
    }
    this.customValidations = customValidations;

    return nativeValidation && !this.customValidations.length;
  }

  _onSubmit(e){
    e.preventDefault();
    this.submit();
  }

  _onTokenSelect(e){
    this.selectedUsers = e.detail.value.map( v => v.value );
  }

  async submit(){
    console.log('todo: submit', {
      operation: this.operation,
      selectedUsers: this.selectedUsers,
      tables: this.tables,
      permission: this.permission
    });
  }


  /**
   * @description Setup options for selecting users
   */
  _setUserOptions(){
    this.userOptions = (this.users || []).map( user => {
      const fullName = `${user?.pgFarmUser?.firstName || ''} ${user?.pgFarmUser?.lastName || ''}`.trim();
      return {
        value: user.name,
        label: fullName ? fullName : user.name,
      }
    });
  }

}

customElements.define('admin-database-user-table-form', AdminDatabaseUserTableForm);
