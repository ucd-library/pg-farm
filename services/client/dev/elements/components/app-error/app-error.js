import { LitElement } from 'lit';
import { render, styles } from "./app-error.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

import user from '@ucd-lib/pgfarm-client/utils/user.js';

export default class AppError extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      heading: {type: String},
      errors: {state: true},
      showLoginButton: {type: Boolean},
      badAuth: {state: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.heading = 'Error';
    this.errors = [];
    this.showLoginButton = false;
    this.badAuth = false;

    this._injectModel('AppStateModel');
  }

  _onAppErrorUpdate(e){
    if ( e.show ) {
      this.show(e.opts);
    } else {
      this.hide();
    }
  }

  show(opts={}){
    this.style.display = 'block';
    document.body.style.overflow = 'hidden';
    this.heading = opts.heading || this.getDefaultHeading();
    if ( opts.errors ) {
      this.errors = opts.errors.map(error => this.formatError(error));
    } else if ( opts.error ) {
      this.errors = [this.formatError({errorMessage: opts.message, response: {value: opts.error}})];
    } else if ( opts.message ) {
      this.errors = [this.formatError({errorMessage: opts.message, showLoginButton: opts.showLoginButton})];
    } else {
      this.errors = [];
    }
    this.setLoginButtonVisibility();
  }

  setLoginButtonVisibility(){
    this.badAuth = this.errors.some(error => error.statusCode === 403 || error.statusCode === 401);
    const manual = this.errors.some(error => error.showLoginButton);
    this.showLoginButton = (this.badAuth || manual) && !user.isValidUser();
  }

  hide(){
    this.style.display = 'none';
    document.body.style.overflow = '';
  }

  getDefaultHeading(){
    if ( this.errors.length > 1 ){
      return 'Multiple errors occurred while loading the page';
    } else {
      return 'An error occurred while loading the page';
    }
  }

  formatError(error){
    const payload = error?.response?.value?.error?.payload || error?.response?.value?.payload || {};
    const url = error?.response?.value?.error?.response?.url ||
      error?.response?.value?.response?.url || '';
    const statusCode = error?.response?.value?.error?.response?.status ||
      error?.response?.value?.response?.status || '';

    const out = {
      heading: 'Unknown error',
      message: payload.message || '',
      stack: payload.stack || '',
      url,
      showDetails: false,
      statusCode
    };

    if ( error.errorMessage ){
      out.heading = error.errorMessage;
    } else if ( payload.message ) {
      out.heading = payload.message;
      out.message = '';
    }

    if ( error.showLoginButton ){
      out.showLoginButton = true;
    }

    return out;
  }

  toggleDetails(error){
    error.showDetails = !error.showDetails;
    this.requestUpdate();
  }

}

customElements.define('app-error', AppError);
