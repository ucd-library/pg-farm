import { LitElement } from 'lit';
import { render, styles } from "./app-search-input.tpl.js";
import { Mixin } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import QueryParamController from '../../../controllers/QueryParamController.js';

/**
 * @description Component that renders a search input field
 * @property {String} value - the value of the input field
 * @property {Boolean} disabled - whether the input field is disabled
 * @property {String} placeholder - the placeholder text for the input field
 * @property {String} queryParam - the url query parameter to use for the search, if not provided, the search event will be dispatched
 * @event search - event dispatched when the form is submitted
 */
export default class AppSearchInput extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      value: {type: String},
      disabled: {type: Boolean},
      placeholder: {type: String},
      queryParam: {type: String, attribute: 'query-param'}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.value = '';
    this.disabled = false;
    this.placeholder = '';

    this._injectModel('AppStateModel');
  }

  connectedCallback() {
    super.connectedCallback();
    this.queryCtl = new QueryParamController(this, this.queryParam, {hostProperty: 'value'});
    this.queryCtl.setFromLocation();
  }

  _onAppStateUpdate(){
    this.queryCtl.setFromLocation();
  }

  _onFormSubmit(e) {
    e.preventDefault();
    if ( this.disabled ) return;
    if ( this.queryParam ){
      this.queryCtl.setLocation({resetOffset: true});
    } else {
      this.dispatchEvent(new CustomEvent('search', {
        detail: {
          value: this.value
        }
      }));
    }
  }
}

customElements.define('app-search-input', AppSearchInput);
