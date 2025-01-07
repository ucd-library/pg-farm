import { LitElement } from 'lit';
import {render, styles} from "./app-search-filter.tpl.js";

import QueryParamController from '../../../controllers/QueryParamController.js';

export default class AppSearchFilter extends LitElement {

  static get properties() {
    return {
      name: { type: String },
      expanded: { type: Boolean },
      options: { type: Array },
      multiple: { type: Boolean },
      searchPlaceholder: { type: String, attribute: 'search-placeholder' },
      searchThreshold: { type: Number, attribute: 'search-threshold' },
      searchValue: { type: String, attribute: 'search-value' },
      queryParam: {type: String, attribute: 'query-param'},
      _options: { state: true },
      _hideSearch: { state: true }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.name = '';
    this.expanded = false;
    this.options = [];
    this._options = [];
    this.searchPlaceholder = '';
    this.searchThreshold = 10;
    this.hideSearch = false;
  }

  willUpdate(props){
    const p = ['name', 'queryParam', 'options', 'searchThreshold'];
    if ( p.some(prop => props.has(prop)) ) {
      this.reset();
    }
  }

  async reset(){
    this.searchValue = '';
    this.queryCtl = new QueryParamController(this, this.queryParam || this.name.toLowerCase(), {isArray: this.multiple});
    await this.queryCtl.setFromLocation();
    this.parseOptions();
    this.hideSearch = this._options.length < this.searchThreshold;
  }

  parseOptions(){
    const options = [];
    for (const option of this.options) {
      const _option = {};
      if ( typeof option === 'string' && option.trim() !== '' ) {
        _option.value = option;
        _option.label = option;
      } else if ( typeof option === 'object' && option.value ) {
        _option.value = option.value;
        _option.label = option.label || option.value;
        _option.count = option.count || 0;
      } else {
        continue;
      }

      const qsValue = this.queryCtl.getProperty();
      _option.selected = this.multiple ? qsValue.includes(_option.value) : qsValue === _option.value;
      options.push(_option);
    }
    if ( options.find(opt => opt.selected) ) {
      this.expanded = true;
    }

    this._options = options;
    this.filterOptions();
  }

  filterOptions(e){
    if ( e?.target?.value !== undefined ){
      this.searchValue = e.target.value.toLowerCase().trim();
    }

    const thresholdMet = this._options.length >= this.searchThreshold;
    this._options.forEach(option => {
      option.hidden = thresholdMet && this.searchValue && !option.label.toLowerCase().includes(this.searchValue);
    });
    this.requestUpdate();
  }

  toggleOption(option){
    if ( this.multiple ) {
      this.queryCtl.toggleArrayValue(option.value, true);
    } else {
      this.queryCtl.setProperty(option.selected ? null : option.value, true);
    }
  }

}

customElements.define('app-search-filter', AppSearchFilter);
