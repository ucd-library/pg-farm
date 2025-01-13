import { LitElement } from 'lit';
import { render, styles } from "./app-contact.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';
import recaptcha from '../../../utils/recaptcha.js';

/**
 * @description An element for the contact page
 * Displays a form for users to express interest in PG-Farm
 * @property {String} pageId - unique id for this page
 * @property {Object} data - The form data
 * @property {Boolean} _showSuccess - Show the success message
 */
export default class AppContact extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: {type: String, attribute: 'page-id'},
      data: {type: Object},
      failedValidations: {type: Array},
      _showSuccess: {type: Boolean},
      _recaptchaDisabled: {type: Boolean}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.data = {};
    this.failedValidations = [];

    this.idGen = new IdGenerator({randomPrefix: true});

    this._injectModel('AppStateModel', 'ContactModel');
  }

  /**
   * @description Callback for when form is submitted by user
   * @param {*} e - form submit event
   */
  async _onFormSubmit(e){
    this.failedValidations = [];
    e.preventDefault();
    this.data._recaptchaToken = await recaptcha.execute();
    this.AppStateModel.showLoading();
    const r = await this.ContactModel.submit(this.data);
    if ( r.error ){
      if ( r?.error?.payload?.details?.validationFailed ) {
        this.failedValidations = r.error.payload.details.missingFields.map(field => {
          return {
            field,
            message: 'This field is required'
          }
        });
      } else {
        this.AppStateModel.showError({
          message: 'Contact form submission failed',
          error: r.error
        });
      }

    } else {
      this._showSuccess = true;
    }
    this.AppStateModel.hideLoading();
    window.scrollTo(0,0);
  }

  /**
   * @description Callback for when the app state is updated
   * @param {Object} e - app state update event
   * @returns
   */
  _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    recaptcha.init();
    this._recaptchaDisabled = recaptcha.disabled;
    this._showSuccess = false;
    this.failedValidations = [];
    this.data = {};

    this.AppStateModel.hideLoading();
  }

  /**
   * @description Callback for when an input element on the form is changed
   * @param {String} prop - property name on this.data
   * @param {*} value - value to set on this.data[prop]
   */
  _onInput(prop, value){
    this.data[prop] = value;
    if ( prop === 'projectStage' ) {
      this.data.projectStageOther = '';
    }
    if ( prop === 'hasDatabase' ){
      this.data.databaseType = '';
    }
    this.requestUpdate();
  }

}

customElements.define('app-contact', AppContact);
