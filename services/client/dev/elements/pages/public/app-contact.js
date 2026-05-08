import { LitElement } from 'lit';
import { render, styles } from "./app-contact.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';

const GOOGLE_FORM_URL = APP_CONFIG.googleContactFormUrl;

const PROJECT_STAGE_LABELS = {
  grant: 'Grant proposal writing',
  ongoing: 'Ongoing',
  archiving: 'Archiving'
};

const ACCESS_LABELS = {
  affiliates: 'UC Davis affiliates',
  external: 'External collaborators',
  application: 'Website Portal and/or Application'
};

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
      _showSuccess: {type: Boolean}
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

    this._injectModel('AppStateModel');
  }

  /**
   * @description Callback for when form is submitted by user
   * @param {Event} e - form submit event
   */
  async _onFormSubmit(e){
    this.failedValidations = [];
    e.preventDefault();

    const required = ['contactName', 'contactEmail', 'projectDescription'];
    for ( const field of required ) {
      if ( !this.data[field] ) {
        this.failedValidations.push({ field, message: 'This field is required' });
      }
    }
    if ( this.failedValidations.length ) return;

    this.AppStateModel.showLoading();

    const params = new URLSearchParams();
    params.append('entry.1003766186', this.data.contactName || '');
    params.append('entry.1102789221', this.data.contactTitle || '');
    params.append('entry.2036958199', this.data.contactEmail || '');
    params.append('entry.1837936735', this.data.contactDepartment || '');
    params.append('entry.1873395665', this.data.projectDescription || '');

    const stageValue = this.data.projectStage === 'other'
      ? (this.data.projectStageOther || '')
      : (PROJECT_STAGE_LABELS[this.data.projectStage] || '');
    params.append('entry.91215101', stageValue);

    params.append('entry.854220166', this.data.hasDatabase === 'yes' ? (this.data.databaseType || '') : 'n/a');
    params.append('entry.1039579611', this.data.datasetSize || '');
    params.append('entry.1997125594', this.data.datasetGrowth === 'yes' ? 'Yes' : 'No');

    for ( const v of (this.data.access || []) ) {
      params.append('entry.1129584238', ACCESS_LABELS[v] || v);
    }

    try {
      await fetch(GOOGLE_FORM_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      this._showSuccess = true;
    } catch(err) {
      this.AppStateModel.showError({
        message: 'Contact form submission failed',
        error: err
      });
    }

    this.AppStateModel.hideLoading();
    window.scrollTo(0, 0);
  }

  /**
   * @description Callback for when the app state is updated
   * @param {Object} e - app state update event
   * @returns
   */
  _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
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
