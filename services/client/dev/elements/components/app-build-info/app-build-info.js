import { LitElement } from 'lit';
import { render, styles } from "./app-build-info.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

export default class AppBuildInfo extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      hideContent: { type: Boolean, attribute: 'hide-content' },
      date: { type: String },
      clientEnv: { type: String, attribute: 'client-env' },
      branch: { type: String },
      commit: { type: String },
      tag: { type: String },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.hideContent = false;
    this.clientEnv = '';
    this.date = '';
    this.branch = '';
    this.commit = '';
    this.tag = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this._getBuildInfo();
  }

  _getBuildInfo() {
    const c = window.APP_CONFIG;
    if ( !c ) {
      this.logger.warn('Failed to get build info, APP_CONFIG not found');
    }
    if ( !c?.buildInfo ) {
      this.logger.warn('Failed to get build info, APP_CONFIG.buildInfo not found');
    }

    this.clientEnv = c?.env || '';
    this.date = c?.buildInfo?.date || '';
    this.branch = c?.buildInfo?.branch || '';
    this.commit = c?.buildInfo?.commit || '';
    this.tag = c?.buildInfo?.tag || '';
  }

}

customElements.define('app-build-info', AppBuildInfo);
