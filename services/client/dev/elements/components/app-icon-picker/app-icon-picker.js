import { LitElement } from 'lit';
import {render, styles} from "./app-icon-picker.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

export default class AppIconPicker extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      value: {type: String},
      iconSet: {type: String, attribute: 'icon-set'},
      default: {type: String},
      _value: {state: true},
      _default: {state: true},
      _loading: {state: true},
      _iconExists: {state: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.value = '';
    this.iconSet = '';
    this.default = '';
    this._default = '';
    this._value = '';
    this._iconExists = false;
    this._loading = false;

    this._injectModel('IconModel');

  }

  async willUpdate(props){
    if ( props.has('value') ){
      this._value = this.iconSet ? this.value.replace(this.iconSet+'.', '') : this.value;
    }
    if ( props.has('default') ){
      this._default = this.iconSet ? this.default.replace(this.iconSet+'.', '') : this.default;
    }
  }

  _onInput(value){
    this._value = value;
    if ( this.timeout ) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(async () => {
      if ( !value ) {
        this.value = '';
        return;
      }
      const slug = this.iconSet ? this.iconSet+'.'+value : value;
      this._loading = true;
      const r = await this.IconModel.get(slug, {noDebounce: true});
      this._loading = false;
      this._iconExists = r?.payload?.[slug];
      if ( this._iconExists ) {
        this.value = slug;
      } else {
        this.value = '';
      }
      this.timeout = null;
    }, 500);
  }

}

customElements.define('app-icon-picker', AppIconPicker);
