import { LitElement } from 'lit';
import {render, styles} from "./app-native-home.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import { config } from '../../../../../../tools/lib/config.js';

export default class AppNativeHome extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      isLoggedIn: { type: Boolean },
      username : { type: String },

    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.isLoggedIn = config.user.loggedIn;

    if( this.isLoggedIn ) {
      this.username = config.user.username || config.user.preferred_username;
      this.expiresText = `${config.user.expires.toLocaleDateString()} ${config.user.expires.toLocaleTimeString()} (${config.user.expiresDays} days from now)`
    } else {
      this.username = '';
      this.expiresText = '';
    }

    this._injectModel('AppStateModel');

  }

  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    this.AppStateModel.hideLoading();
  }

  async _login() {
    await window.electronAPI.login();
    window.location.reload();
  }

  async _copyToken() {
    let user = await config.getUser();
    if (user?.token) {
      try {
        await navigator.clipboard.writeText(user.token);
        this.AppStateModel.showToast({
          text: 'Copied token to clipboard',
          type: 'success'
        });
      } catch (err) {
        console.error('Failed to copy token:', err);
        this.AppStateModel.showToast({
          text: 'Failed to copy token to clipboard',
          type: 'error'
        });
      }
    }
  }

}

customElements.define('app-native-home', AppNativeHome);