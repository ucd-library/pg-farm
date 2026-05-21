import { LitElement } from 'lit';
import {render, styles} from "./service-account-teaser.tpl.js";
import {Mixin} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import { renderServiceAccountRotationConfirmation } from '@ucd-lib/pgfarm-client/elements/templates/dialog-modals.js';

export default class ServiceAccountTeaser extends Mixin(LitElement)
  .with(LitCorkUtils) {


  static get properties() {
    return {
      data: { type: Object },
      username: { type: String },
      lastRotatedText: { type: String },
      rotating: { state: true }
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
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-account.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.AppStateModel.showToast({text: 'Service account password rotated successfully', type: 'success'});
  }

}

customElements.define('service-account-teaser', ServiceAccountTeaser);