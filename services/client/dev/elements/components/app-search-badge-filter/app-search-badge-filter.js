import { LitElement } from 'lit';
import {render, styles} from "./app-search-badge-filter.tpl.js";
import { Mixin } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import QueryParamController from '../../../controllers/QueryParamController.js';

export default class AppSearchBadgeFilter extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      queryParam: {type: String, attribute: 'query-param'},
      multiple: { type: Boolean },
      labels: { type: Array },
      filters: {state: true},
      active: {type: Boolean, reflect: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.queryParam = '';
    this.multiple = false;
    this.labels = [];
    this.filters = [];

    this._injectModel('AppStateModel');
  }

  willUpdate(props){
    const p = ['queryParam', 'labels', 'multiple'];
    if ( p.some(prop => props.has(prop)) ) {
      this.reset();
    }
  }

  _onAppStateUpdate(){
    this.reset();
  }

  async reset(){
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
    if ( this.multiple ) {
      this.queryCtl.toggleArrayValue(filter.value, true);
    } else {
      this.queryCtl.setProperty(null, true);
    }
  }

}

customElements.define('app-search-badge-filter', AppSearchBadgeFilter);
