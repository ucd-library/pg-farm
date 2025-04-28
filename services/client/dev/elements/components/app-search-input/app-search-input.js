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
      label: {type: String},
      queryParam: {type: String, attribute: 'query-param'},
      grayLabel: {type: Boolean, attribute: 'gray-label'},
      searchBarStyle: {type: String, attribute: 'search-bar-style'}
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
    this.label = '';
    this.grayLabel = false;

    this._injectModel('AppStateModel');
  }

  connectedCallback() {
    super.connectedCallback();
    this.queryCtl = new QueryParamController(this, this.queryParam, {hostProperty: 'value'});
    if ( this.queryParam ){
      this.queryCtl.setFromLocation();
    }
  }

  willUpdate(props){
    const searchBarStyles = ['default', 'basic'];
    if ( props.has('searchBarStyle') && !searchBarStyles.includes(this.searchBarStyle) ){
      this.searchBarStyle = searchBarStyles[0];
    }
  }

  _onAppStateUpdate(){
    if ( this.queryParam ){
      this.queryCtl.setFromLocation();
    }
  }

  _onInput(e) {
    this.value = e.target.value;
    this.dispatchEvent(new CustomEvent('search-input', {
      detail: {
        value: this.value
      }
    }));
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
