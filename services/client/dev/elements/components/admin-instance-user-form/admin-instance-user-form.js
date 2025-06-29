import { LitElement } from 'lit';
import {render, styles} from "./admin-instance-user-form.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';

/**
 * @description Form component for adding or updating a user to an instance and managing overall access to a database
 * @property {String} operation - form operation type, 'create' or 'update'
 * @property {String} orgName - organization name
 * @property {String} dbName - database name
 * @property {String} instanceName - instance name
 * @property {Object} payload - the form data
 * @property {Array} customValidations - list of custom validation messages
 */
export default class AdminInstanceUserForm extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      operation: { type: String },
      orgName: { type: String },
      dbName: { type: String },
      instanceName: { type: String },
      username: { type: String },
      schema: { type: String },
      payload: { type: Object },
      customValidations: { type: Array },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.operation = '';
    this.payload = {};
    this.orgName = '';
    this.dbName = '';
    this.instanceName = '';
    this.schema = '';
    this.customValidations = [];

    this.idGen = new IdGenerator({randomPrefix: true});
    this._injectModel('InstanceModel', 'AppStateModel', 'DatabaseModel');
  }

  willUpdate(props){
    // validate form operation type
    if ( props.has('operation') ) {
      const operations = ['create', 'update', 'update-schema'];
      if( this.operation && !operations.includes(this.operation) ) {
        this.logger.warn('Invalid operation', this.operation);
        this.operation = operations[0];
      } else if ( !this.operation ) {
        this.operation = operations[0];
      }
    }
  }

  _onSubmit(e){
    e.preventDefault();
    this.submit();
  }

  async submit(){
    if ( this.operation === 'create' ) {
      return await this._create();
    } else if ( this.operation === 'update' ) {
      return await this._update();
    } else if ( this.operation === 'update-schema' ) {
      return await this._updateSchemaAccess();
    }
    return false;
  }

  async _updateSchemaAccess(){
    this._loading = true;
    const errorMessage = `Unable to update access to schema '${this.schema}' for user '${this.payload.username}'`;
    const access = await this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, this.schema, this.payload.username, this.payload.access);
    const error = access.find(r => r.state === 'error');
    if( error ) {
      this._loading = false;
      return this.AppStateModel.showError({
        message: errorMessage,
        error: error.error
      });
    }
    this._loading = false;
    this.AppStateModel.showToast({
      type: 'success',
      text: `Access to schema '${this.schema}' for user '${this.payload.username}' updated`,
      showOnPageLoad: true
    });
    return true;
  }

  async _update(){
    this._loading = true;
    const errorMessage = `Unable to update user '${this.payload.username}'`;
    const opts = {
      type: this.payload.admin ? 'ADMIN' : 'USER'
    }
    const instanceUser = await this.InstanceModel.updateUser(this.orgName, this.instanceName, this.payload.username, opts);
    if ( instanceUser.state === 'error' ){
      this._loading = false;
      return this.AppStateModel.showError({
        message: errorMessage,
        error: instanceUser.error
      });
    }
    const access = await this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, '_', this.payload.username, this.payload.access);
    const error = access.find(r => r.state === 'error');
    if( error ) {
      this._loading = false;
      return this.AppStateModel.showError({
        message: errorMessage,
        error: error.error
      });
    }
    this._loading = false;
    this.AppStateModel.showToast({
      type: 'success',
      text: `User ${this.payload.username} updated`,
      showOnPageLoad: true
    });
    return true;
  }

  async _create(){
    this._loading = true;

    // create user in instance
    const opts = {
      admin: this.payload.admin
    }
    const create = await this.InstanceModel.addUser(this.orgName, this.instanceName, this.payload.username, opts);
    if ( create.state === 'error' ){
      this._loading = false;
      return this.AppStateModel.showError({
        message: 'Unable to add user',
        error: create.error
      });
    }

    // set user access to database
    const access = await this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, '_', this.payload.username, this.payload.access || 'READ');
    const error = access.find(r => r.state === 'error');
    if( error ) {
      this._loading = false;
      return this.AppStateModel.showError({
        message: 'Unable to set user access',
        error: error.error
      });
    }

    this._loading = false;
    this.AppStateModel.showToast({
      type: 'success',
      text: `User ${this.payload.username} added to instance ${this.instanceName}`,
      showOnPageLoad: true
    });
    return true;
  }

  _onInput(prop, value){
    this.payload[prop] = value;
    this.requestUpdate();
  }

  checkValidity(){
    return this.renderRoot.querySelector('form').checkValidity();
  }

  reportValidity(){
    let nativeValidation =  this.renderRoot.querySelector('form').reportValidity();

    const customValidations = [];
    if( !this.payload.username ) {
      customValidations.push({
        message: 'Please select at least one user'
      });
    }
    this.customValidations = customValidations;

    return nativeValidation && !this.customValidations.length;
  }

}

customElements.define('admin-instance-user-form', AdminInstanceUserForm);
