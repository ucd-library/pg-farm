import { LitElement } from 'lit';
import {render, styles} from "./app-icon-picker.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

/**
 * @description A picker for selecting an app icon
 * @property {String} value - the value of the icon, e.g. fa.solid.user
 * @property {String} iconSet - optional. the icon set to limit the picker to, e.g. fa.solid
 * @property {String} brandColor - optional. the brand color to use for the icon
 * @property {String} default - optional. the default icon to display if no value is set
 * @fires change - when the value changes and after the icon has been checked for existence
 */
export default class AppIconPicker extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      value: {type: String},
      iconSet: {type: String, attribute: 'icon-set'},
      brandColor: {type: String, attribute: 'brand-color'},
      default: {type: String},
      searchResults: {type: Array},
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
    this.brandColor = '';
    this._iconExists = false;
    this._loading = false;
    this.searchResults = [];

    this._injectModel('IconModel');

    this.IconModel.get('fa-circle-notch,fa.regular.circle-question');
  }

  async willUpdate(props){
    if ( props.has('value') ){
      this._value = this.iconSet ? this.value.replace(this.iconSet+'.', '') : this.value;
      if ( this._value ) {
        const r = await this.IconModel.get(this.value);
        this._iconExists = r?.[this.value] ? true : false;
      }
    }
    if ( props.has('default') ){
      this._default = this.iconSet && !this.default.includes(this.iconSet) ? this.iconSet+'.'+this.default : this.default;
      this.IconModel.get(this._default);
    }
  }

  _onSuggestionClick(result) {
    let value = result.name.replace('.svg', '');
    if ( !this.iconSet ) {
      value = [result.isFa ? 'fa' : '', result.type, value].filter(v => v).join('.');
    }
    this._onInput(value);
  }

  _onInput(value){
    this._value = value;
    if ( this.timeout ) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(async () => {
      this._iconExists = false;
      if ( !this._value ) {
        this.value = '';
        this.emitChange();
        return;
      }
      const slug = this.iconSet ? this.iconSet+'.'+this._value : this._value;
      this._loading = true;
      const r = await this.IconModel.get(slug, {noDebounce: true});
      this._loading = false;

      this._iconExists = r?.[slug] ? true : false;
      this.value = slug;
      this.timeout = null;
      this.emitChange();
    }, 500);
  }

  _onFocus() {
    this.search();
  }

  _onBlur() {
    setTimeout(() => {
      this.searchResults = [];
    }, 100);
  }

  _onKeyUp(e) {
    if( e.keyCode === 13 ) return;
    this.search();
  }

  search() {
    if( !this._value ) {
      this.searchResults = [];
      return;
    }
    this.IconModel.search(this._value);
  }

  _onIconSearchUpdate(e) {
    if( e.state !== 'loaded' ) return;
    this.searchResults = e.payload;
  }

  emitChange(){
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        value: this.value,
        iconExists: this._iconExists
      }
    }));
  }

}

customElements.define('app-icon-picker', AppIconPicker);
