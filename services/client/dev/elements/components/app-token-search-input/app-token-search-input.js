import { LitElement } from 'lit';
import {render, styles} from "./app-token-search-input.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

export default class AppTokenSearchInput extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      placeholder: {type: String},
      value: {type: String},
      options: {type: Array},
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
    this._options = [];
  }

  willUpdate(props){
    if ( props.has('options') ){
      this._options = this.options.map(opt => {
        const _opt = { data: opt };
        if ( typeof opt === 'string' ){
          _opt.value = opt;
          _opt.label = opt;
        }
        if ( opt?.value ) {
          _opt.value = opt.value;
          _opt.label = opt.label || opt.value;
        } else {
          _opt.value = '';
          _opt.label = '';
          this.logger.warn('options must be an array of strings or objects with value and label properties');
        }
        return _opt;
      });
    }
  }

  _onSearch(e){
    const value = e.detail.value;
    console.log('searching for', value);
  }

}

customElements.define('app-token-search-input', AppTokenSearchInput);
