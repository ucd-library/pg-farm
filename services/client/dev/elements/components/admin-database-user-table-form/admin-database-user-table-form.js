import { LitElement } from 'lit';
import {render, styles} from "./admin-database-user-table-form.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';
import AppComponentController from '@ucd-lib/pgfarm-client/controllers/AppComponentController.js';

/**
 * @description Form component for adding or removing table access for users
 * @property {String} operation - form operation type, 'add-users' or 'remove-users'
 * @property {Array} users - list of database users
 * @property {Array} tables - list of database tables to act on
 * @property {String} permission - table access permission type, 'READ' or 'WRITE'. default is 'READ'
 * @property {Array} userOptions - Formatted user list for token input
 * @property {Array} selectedUsers - list of selected users
 * @property {Array} customValidations - list of custom validation messages
 */
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
    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  /**
   * @description Lifecycle method called when the component will be updated
   * @param {*} props - the properties that have changed
   */
  willUpdate(props){
    if (props.has('users') ){
      this._setUserOptions();
    }
  }

  /**
   * @description reset the form to its initial state
   */
  reset(){
    this._setUserOptions();
    this.selectedUsers = [];
    this.permission = '';
    this.customValidations = [];
  }

  /**
   * @description validate the form, and show any validation errors
   * @returns {Boolean} - true if the form is valid, false otherwise
   */
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

  /**
   * @description callback for when the form is submitted
   * @param {*} e
   */
  _onSubmit(e){
    e.preventDefault();
    this.submit();
  }

  /**
   * @description callback for when a user is selected in the token input
   * @param {*} e
   */
  _onTokenSelect(e){
    this.selectedUsers = e.detail.value.map( v => v.value );
  }

  /**
   * @description submit the form
   * @returns {Boolean} - true if the form was submitted successfully, false otherwise
   */
  async submit(){
    const grants = this.selectedUsers.flatMap( user => {
      return this.tables.map( table => {
        return {
          user,
          schema: `${table.schema}.${table.tableName}`,
          permission: this.permission || 'READ'
        }
      });
    });

    if ( this.operation === 'add-users' ) {
      const r = await this.DatabaseModel.bulkGrantAccess(this.compCtl.orgName, this.compCtl.dbName, grants);
      if ( r.state === 'error' ){
        this.AppStateModel.showError({
          message: 'Unable to add user access',
          error: r.error
        });
        return false;
      }
      this.AppStateModel.showToast({
        type: 'success',
        text: `User access has been added`,
        showOnPageLoad: true
      });
      return true;

    } else if ( this.operation === 'remove-users' ) {
      const r = await this.DatabaseModel.bulkRevokeAccess(this.compCtl.orgName, this.compCtl.dbName, grants);
      if ( r.state === 'error' ){
        this.AppStateModel.showError({
          message: 'Unable to remove user access',
          error: r.error
        });
        return false;
      }
      this.AppStateModel.showToast({
        type: 'success',
        text: `User access has been removed`,
        showOnPageLoad: true
      });
      return true;
    }
    return false;
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
