import { LitElement } from 'lit';
import {render, styles} from "./admin-org-metadata-form.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';
import blobUtils from '@ucd-lib/pgfarm-client/utils/blobUtils.js';

export default class AdminOrgMetadataForm extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      org: {type: Object},
      payload: {state: true},
      _loading: {type: Boolean}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.org = {};
    this.payload = {};
    this._loading = false;

    this.idGen = new IdGenerator({randomPrefix: true});
    this._injectModel('OrganizationModel', 'AppStateModel');
  }

  willUpdate(props){
    if ( props.has('org') ) {
      this.payload = {
        title: this.org?.title || '',
        description: this.org?.description || '',
        url: this.org?.url || '',
        logo: this.org?.logo || '',
        email: this.org?.email || '',
        phone: this.org?.phone || '',
        logo_file_type: this.org?.logo_file_type || '',
      };
    }
  }

  _onSubmit(e){
    e.preventDefault();
    this.submit();
  }

  async submit(){
    this._loading = true;

    // convert logo to base64 data URL if it's a Buffer
    if (this.payload.logo && this.payload.logo.type === 'Buffer' ) {
      this.payload.logo = blobUtils.toDataUrl(this.payload.logo, this.payload.logo_file_type);
    } 

    const update = await this.OrganizationModel.update(this.org.name, this.payload);
    if ( update.state === 'error' ){
      this._loading = false;
      return this.AppStateModel.showError({
        message: 'Unable to update organization',
        error: update.error
      });
    }
    this._loading = false;
    return true;
  }

  _onInput(prop, value){
    this.payload[prop] = value;
    this.requestUpdate();
  }

  checkValidity(){
    return this.renderRoot.querySelector('form').checkValidity();
  }

  reportValidity(){
    return this.renderRoot.querySelector('form').reportValidity();
  }

}

customElements.define('admin-org-metadata-form', AdminOrgMetadataForm);
