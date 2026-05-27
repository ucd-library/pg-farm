import { LitElement } from 'lit';
import {render, styles} from "./service-account-teaser.tpl.js";
import {Mixin} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import blobUtils from '../../../utils/blobUtils.js';

import { renderServiceAccountRotationConfirmation } from '@ucd-lib/pgfarm-client/elements/templates/dialog-modals.js';

/**
 * @description Component for displaying a service account in a list, with the option to rotate its password.
 * @property {Object} data - service account data object from API endpoint
 * @property {String} username - Service account display username computed from data object
 * @property {String} lastRotatedText - Service account last rotated text computed from data object
 * @property {Boolean} rotating - Whether a password rotation is currently in progress
 * @property {String} nonce - Unique nonce to correlate global dialog actions with this component instance
 */
export default class ServiceAccountTeaser extends Mixin(LitElement)
  .with(LitCorkUtils) {


  static get properties() {
    return {
      data: { type: Object },
      username: { state: true },
      lastRotatedText: { state: true },
      rotating: { state: true },
      nonce: { state: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.data = {};
    this.username = '';
    this.lastRotatedText = '';
    this.rotating = false;

    this.nonce = Math.random().toString(36).substring(2);

    this._injectModel('AppStateModel', 'ServiceAccountModel');
  }

  /**
   * @description Lit lifecycle method
   * @param {Map} props - change properties
   */
  willUpdate(props){
    if ( props.has('data') ){

      // lastRotatedText
      if ( !this.data.lastRotatedAt ) {
        this.lastRotatedText = 'Never';
      } else {
        const lastRotated = new Date(this.data.lastRotatedAt);
        if ( !isNaN(lastRotated.getTime()) ) {
          this.lastRotatedText = lastRotated.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
        } else {
          this.lastRotatedText = 'Unknown';
        }
      }

      // username
      this.username = (this.data.username || '').replace(/-service-account$/, '');
    }
  }

  /**
   * @description Click handler for rotate password action. Opens a confirmation dialog.
   */
  _onRotateClick(){
    this.AppStateModel.showDialogModal({
        title: 'Rotate Service Account Password',
        actions: [
            {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
            {text: 'Confirm Rotation', value: 'service-account-rotate-password', color: 'secondary'}
        ],
        content: renderServiceAccountRotationConfirmation(this.data),
        data: {user: this.data, nonce: this.nonce}
    });
  }

  /**
   * @description Global dialog action handler. Listens for the rotate password confirmation action, 
   * then calls the model to rotate the password and triggers a file download of the new credentials.
   * @param {Object} e - Dialog action event object
   * @returns 
   */
  async _onAppDialogAction(e){
    if ( e.action?.value !== 'service-account-rotate-password' || e.data.nonce !== this.nonce ) return;
    this.rotating = true;
    const r = await this.ServiceAccountModel.rotatePassword(this.data.username);
    this.rotating = false;
    if ( r?.state === 'error' ){
      this.AppStateModel.showToast({text: 'Error rotating service account password', type: 'error'});
      return;
    }
    const payload = r?.payload;
    this.data = {...this.data, lastRotatedAt: payload.lastRotatedAt};

    blobUtils.downloadJsonAsFile(payload, 'service-account.json');

    this.AppStateModel.showToast({text: 'Service account password rotated successfully', type: 'success'});
  }

}

customElements.define('service-account-teaser', ServiceAccountTeaser);