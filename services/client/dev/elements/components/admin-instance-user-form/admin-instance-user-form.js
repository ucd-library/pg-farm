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
 */
export default class AdminInstanceUserForm extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      operation: { type: String },
      orgName: { type: String },
      dbName: { type: String },
      instanceName: { type: String },
      payload: { state: true },
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

    this.idGen = new IdGenerator({randomPrefix: true});
    this._injectModel('InstanceModel', 'AppStateModel', 'DatabaseModel');
  }

  willUpdate(props){
    // validate form operation type
    if ( props.has('operation') ) {
      const operations = ['create', 'update'];
      if( this.operation && !operations.includes(this.operation) ) {
        this.logger.warning('Invalid operation', this.operation);
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
    this._loading = true;

    if ( this.operation === 'create' ) {
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
      if ( !this.payload.admin && this.payload.access && this.payload.access !== 'READ' ) {
        const access = await this.DatabaseModel.setSchemaUserAccess(this.orgName, this.dbName, '_', this.payload.username, this.payload.access);
        const error = access.find(r => r.state === 'error');
        if( error ) {
          this._loading = false;
          return this.AppStateModel.showError({
            message: 'Unable to set user access',
            error: error.error
          });
        }
      }
      this._loading = false;
      this.AppStateModel.showToast({type: 'success', text: 'User added'});
      return true;
    }
  }

  _onInput(prop, value){
    this.payload[prop] = value;
    this.requestUpdate();
  }

  checkValidity(){
    return this.renderRoot.querySelector('form').checkValidity();
  }

  reportValidity(){
    return this.renderRoot.querySelector('form').reportValidity();
  }

}

customElements.define('admin-instance-user-form', AdminInstanceUserForm);
