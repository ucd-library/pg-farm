import { LitElement } from 'lit';
import {render, styles} from "./app-search-badge-filter.tpl.js";
import { Mixin } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import QueryParamController from '../../../controllers/QueryParamController.js';

/**
 * @description Component that displays filter badge(s) from a query parameter.
 * @property {String} queryParam - The url query parameter to use for the filter.
 * @property {Array} value - If value is set, query parameter will be ignored and this values will be used instead.
 * @property {Boolean} multiple - Whether the url query parameter can have multiple comma separated values.
 * @property {Array} labels - List of objects with value and label properties to use for display. Optional.
 * @property {Boolean} active - Whether the filter is being displayed.
 */
export default class AppSearchBadgeFilter extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      queryParam: {type: String, attribute: 'query-param'},
      values: {type: Array},
      multiple: { type: Boolean },
      labels: { type: Array },
      active: {type: Boolean, reflect: true},
      filters: {state: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.queryParam = '';
    this.values = [];
    this.multiple = false;
    this.labels = [];
    this.filters = [];

    this._injectModel('AppStateModel');
  }

  willUpdate(props){
    const p = ['queryParam', 'labels', 'multiple', 'values'];
    if ( p.some(prop => props.has(prop)) ) {
      this.reset();
    }
  }

  _onAppStateUpdate(){
    this.reset();
  }

  async reset(){
    if ( this.values?.length ){
      this.filters = this.values.map(value => {
        const label = this.labels.find(label => label?.value === value)?.label || value;
        return {label, value};
      });
      this.active = this.filters.length > 0;
      return;
    }

    this.queryCtl = new QueryParamController(this, this.queryParam, {isArray: this.multiple});
    await this.queryCtl.setFromLocation();

    const filters = [];
    if ( this.multiple ){
      this.queryCtl.value.forEach(value => {
        const label = this.labels.find(label => label?.value === value)?.label || value;
        filters.push({label, value});
      });
    } else if ( this.queryCtl.value ) {
      const value = this.queryCtl.value;
      const label = this.labels.find(label => label?.value === value)?.label || value;
      filters.push({label, value});
    }
    this.filters = filters;
    this.active = this.filters.length > 0;
  }

  _onClick(filter){

    if ( this.values?.length) {
      this.dispatchEvent(new CustomEvent('remove', {
        bubbles: true,
        composed: true,
        detail: {value: filter.value}
      }));
      return;
    }

    if ( this.multiple ) {
      this.queryCtl.toggleArrayValue(filter.value, true);
    } else {
      this.queryCtl.setProperty(null, true);
    }
  }

}

customElements.define('app-search-badge-filter', AppSearchBadgeFilter);
