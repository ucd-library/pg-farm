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
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.isLoggedIn = config.user.loggedIn;

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

}

customElements.define('app-native-home', AppNativeHome);