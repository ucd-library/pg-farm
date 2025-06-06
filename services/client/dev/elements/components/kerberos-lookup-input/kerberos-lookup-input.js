import { LitElement } from 'lit';
import {render, styles} from "./kerberos-lookup-input.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';

/**
 * @description Kerberos lookup component, to search the ucdavis iam api
 */
export default class KerberosLookupInput extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      kerberosId: { type: String },
      value: { type: String },
      userFullName: { type: String },
      payload: { type: Object }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.kerberosId = '';
    this.value = '';
    this.userFullName = '';
    this.payload = {};

    this.idGen = new IdGenerator({randomPrefix: true});

    this._injectModel('UserModel', 'AppStateModel');
  }

  _onAppDialogOpen(){
    this.reset();
  }

  reset() {
    this.kerberosId = '';
    this.value = '';
    this.userFullName = '';
  }

  _onInput(prop, value='') {
    this.value = value;
    let searchValue = value.trim().toLowerCase();
    this.kerberosId = '';
    this.userFullName = '';
    const organization = this.AppStateModel.location?.path?.[1] || '';
    const database = this.AppStateModel.location?.path?.[2] || '';
    let contextOptions = {
      organization,
      database,
    };

    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      if( searchValue.length ) {
        this.UserModel.search(searchValue, contextOptions);
        this.requestUpdate();
      }
    }, 420);
  }

  _onUserSearchUpdate(e) {
    if( !e.payload || !e.payload.success ) {
      this.userFullName = '';
      this.kerberosId = '';
      this.payload = {};
      return;
    }

    this.payload = e.payload.resp || {};
    this.userFullName = this.payload.dFullName || '';
    this.kerberosId = this.payload.userID || '';

    this.dispatchEvent(new CustomEvent('user-found', {
      detail: {kerberosId: this.kerberosId}
    }));
  }
}

customElements.define('kerberos-lookup-input', KerberosLookupInput);
