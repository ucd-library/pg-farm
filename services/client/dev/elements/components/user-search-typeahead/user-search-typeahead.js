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
      searchResults: { type: Array },
      userFullName: { type: String },
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
    this.userFullName = '';

    this.idGen = new IdGenerator({randomPrefix: true});

    this._injectModel('UserModel', 'AppStateModel');

    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  _onAppDialogOpen(){
    this.reset();
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
    }
  }

  reset() {
    this.kerberosId = '';
    this.searchTerm = '';
    this.searchResults = [];
    this.userFullName = '';
  }

  _onInput(prop, value){
    this.userFullName = '';
    const organization = this.AppStateModel.location?.path?.[1] || '';
    const database = this.AppStateModel.location?.path?.[2] || '';

    let contextOptions = {
      organization,
      database,
    };

    this.UserModel.search(value.trim(), contextOptions);
    this.searchTerm = value.trim();
    this.requestUpdate();
  }

  _onUserSearchUpdate(e) {
    if( !e.payload || !e.payload.success ) {
      this.searchResults = [];
      return;
    }

    // could expand to more than a single result later
    let searchResults = [];
    if( e.payload?.success ) {
      searchResults.push({
        userID: e.payload?.resp?.userID,
        dFullName: e.payload?.resp?.dFullName
      });
    }
    this.searchResults = searchResults;
  }

  _onSelectResult(e) {
    let searchIndex = e.currentTarget.dataset.rowId;
    if( !searchIndex ) return;

    let match = this.searchResults[searchIndex] || {};
    this.kerberosId = match.userID || '';
    this.userFullName = match.dFullName || '';
    this.searchResults = [];

    this.dispatchEvent(new CustomEvent('select', {
      detail: {kerberosId: this.kerberosId}
    }));
  }

}

customElements.define('user-search-typeahead', UserSearchTypeahead);
