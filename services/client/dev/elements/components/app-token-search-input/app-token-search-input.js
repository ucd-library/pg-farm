import { LitElement } from 'lit';
import {render, styles} from "./app-token-search-input.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

/**
 * @description A typeahead input that allows for selecting multiple options, displayed as badges/tokens
 * @property {String} placeholder - the placeholder text for the input
 * @property {String} value - the current value of the input
 * @property {Array} options - the searchable options to display. Can be an array of strings or objects with value and label properties
 * @property {Boolean} showValueInResults - if true, the value, in additio to the label, will be displayed in the results list
 * @property {Boolean} invertValueAndLabel - if true, the value will be displayed before the label in the results list
 * @property {Function} filterFunction - a custom filter function to use for filtering the options. The function should take two arguments: the option and the search value
 * @property {Array} _options - variable to hold the state of the options
 */
export default class AppTokenSearchInput extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      placeholder: {type: String},
      value: {type: String},
      options: {type: Array},
      showValueInResults: {type: Boolean, attribute: 'show-value-in-results'},
      invertValueAndLabel: {type: Boolean, attribute: 'invert-value-and-label'},
      filterFunction: {},
      _options: {type: Array},
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.placeholder = '';
    this.value = '';
    this.options = [];
    this.filterFunction = null;
    this.showValueInResults = false;
    this.invertValueAndLabel = false;
    this._options = [];
  }

  /**
   * @description Lifecycle method called when element will update
   * @param {Map} props - the properties that have changed
   */
  willUpdate(props){
    if ( props.has('options') ){
      this._processOptions();
    }
  }

  /**
   * @description Process options array passed by user. Sets the option state as _options property.
   */
  _processOptions(){
    this._options = this.options.map(opt => {
      const _opt = {
        data: opt,
        hidden: true,
        selected: false
      };
      if ( typeof opt === 'string' ){
        _opt.value = opt;
        _opt.label = opt;
      }
      else if ( opt?.value ) {
        _opt.value = opt.value;
        _opt.label = opt.label || opt.value;
        _opt.selected = opt.selected || false;
      } else {
        _opt.value = '';
        _opt.label = '';
        this.logger.warn('options must be an array of strings or objects with value and label properties');
      }
      return _opt;
    });
  }

  /**
   * @description Callback for when the value changes on the search input
   * @param {*} e - the event object
   */
  _onSearch(e){
    this.value = e.detail.value || '';
    const value = this.value.toLowerCase();
    this._options.forEach(opt => {
      if ( this.filterFunction ){
        opt.hidden = !this.filterFunction(opt, value);
      } else {
        if ( !value ){
          opt.hidden = true;
        } else {
          opt.hidden = !(opt.label.toLowerCase().includes(value) || opt.value.toLowerCase().includes(value));
        }
      }
    });
    this.requestUpdate();
  }

  /**
   * @description Callback for when an option is selected
   * @param {Object} opt - the selected option from the _options array
   */
  _onSelect(opt){
    opt.selected = true;
    this._options.forEach(o => {
      o.hidden = true;
    });
    this.value = '';
    this.requestUpdate();
    this._emitChange();
  }

  /**
   * @description Callback for when an option is removed
   * @param {String} value - _option.value
   */
  _onRemove(value){
    const opt = this._options.find(opt => opt.value === value);
    if ( opt ){
      opt.selected = false;
      this.requestUpdate();
      this._emitChange();
    }
  }

  /**
   * @description Emit a change event with the selected options
   */
  _emitChange(){
    const selected = this._options.filter(opt => opt.selected);
    this.dispatchEvent(new CustomEvent('token-select', {
      detail: {value: selected.map(opt => opt.data)},
      bubbles: true,
      composed: true
    }));
  }

}

customElements.define('app-token-search-input', AppTokenSearchInput);
