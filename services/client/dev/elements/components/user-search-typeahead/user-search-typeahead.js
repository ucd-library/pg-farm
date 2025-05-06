import { LitElement } from 'lit';
import {render, styles} from "./user-search-typeahead.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';


/**
 * @description User search typeahead component, to search the ucdavis iam api
 */
export default class UserSearchTypeahead extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      kerberosId: { type: String },
      searchTerm: { type: String },
      searchResults: { type: Array }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.kerberosId = '';
    this.searchTerm = '';
    this.searchResults = [];

    this.idGen = new IdGenerator({randomPrefix: true});

    this._injectModel('UserModel');

    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleOutsideClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._handleOutsideClick);
    super.disconnectedCallback();
  }

  _handleOutsideClick(e) {
    if (!this.contains(e.target)) {
      this.searchResults = [];
      this.searchTerm = '';
    }
  }

  _onInput(prop, value){
    this.UserModel.search(value.trim());
    this.searchTerm = value.trim();
    this.requestUpdate();
  }

  _onUserSearchUpdate(e) {
    if( !e.payload || !e.payload.success ) {
      this.searchResults = [];
      return;
    }

    this.searchResults = e.payload?.success ? e.payload?.resp : [];
  }

  _onSelectResult(e) {
    let searchIndex = e.currentTarget.dataset.rowId;
    if( !searchIndex ) return;

    let match = this.searchResults[searchIndex] || {};
    this.kerberosId = match.userId || 'no kerberos id';
    this.searchResults = [];
    this.searchTerm = '';

    this.dispatchEvent(new CustomEvent('select', {
      detail: {kerberosId: this.kerberosId}
    }));
  }
  
}

customElements.define('user-search-typeahead', UserSearchTypeahead);
