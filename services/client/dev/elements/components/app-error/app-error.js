import { LitElement } from 'lit';
import { render, styles } from "./app-error.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

export default class AppError extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      heading: {type: String},
      errors: {state: true}
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
    } else {
      this.errors = [];
    }

    console.log(opts.errors);
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
    const payload = error?.response?.value?.error?.payload || {};
    console.log(payload);

    const out = {
      heading: 'Unknown error',
      message: payload.message || '',
      stack: payload.stack || '',
      url: error?.response?.value?.error?.response?.url || '',
      showDetails: false
    };

    if ( error.errorMessage ){
      out.heading = error.errorMessage;
    } else if ( payload.message ) {
      out.heading = payload.message;
      out.message = '';
    }

    return out;
  }

  toggleDetails(error){
    error.showDetails = !error.showDetails;
    this.requestUpdate();
  }

}

customElements.define('app-error', AppError);
