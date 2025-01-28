import { LitElement } from 'lit';
import {render, styles} from "./admin-database-wake.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';
import { WaitController } from "@ucd-lib/theme-elements/utils/controllers/wait.js";

/**
 * @description Component for displaying database wake up button and status
 * @prop {String} orgName - organization name
 * @prop {String} dbName - database name
 * @prop {Boolean} isAwake - the database is awake
 * @prop {Boolean} _isWakingUp - the database is waking up after user click
 */
export default class AdminDatabaseWake extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      orgName: { type: String},
      dbName: { type: String},
      isAwake: { type: Boolean},
      _isWakingUp: { type: Boolean, state: true }
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
    this.isAwake = false;
    this._isWakingUp = false;

    this.wait = new WaitController(this);

    this._injectModel('DatabaseModel', 'AppStateModel', 'InstanceModel');
  }

  willUpdate(props){
    if ( props.has('orgName') || props.has('dbName') ) {
      this.isAwake = false;
      if ( this.orgName && this.dbName ) {
        this.DatabaseModel.get(this.orgName, this.dbName);
      }
    }
  }

  _onDatabaseMetadataUpdate(e){
    if ( e.state !== 'loaded' ) return;
    if ( !this.orgName || !this.dbName ) return;
    if ( e.db !== this.dbName || e.org !== this.orgName ) return;
    this.isAwake = e.payload?.instance?.state !== 'SLEEP';
  }

  async _onWakeUpBtnClick() {
    this._isWakingUp = true;
    const r = await this.InstanceModel.start(this.orgName, this.dbName, {});
    if ( r.state === 'error' ){
      this.AppStateModel.showToast({text: 'An error occurred when starting the database.', type: 'error'});
      this.logger.error('Error starting database', r);
      this._isWakingUp = false;
      return;
    }
    await this.wait.wait(3000);
    this._isWakingUp = false;
    this.AppStateModel.showToast({text: `${this.orgName}/${this.dbName} has been woken up successfully`, type: 'success'});
    this.dispatchEvent(new CustomEvent('wake-up-successful', {detail: {org: this.orgName, db: this.dbName}}));
  }

}

customElements.define('admin-database-wake', AdminDatabaseWake);
