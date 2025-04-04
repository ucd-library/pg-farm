import { LitElement, html } from 'lit';
import { render, styles } from "./app-organization.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';
import blobUtils from '@ucd-lib/pgfarm-client/utils/blobUtils.js';

import '@ucd-lib/pgfarm-client/elements/components/admin-org-metadata-form/admin-org-metadata-form.js';

export default class AppOrganization extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: {type: String, attribute: 'page-id'},
      orgName: { type: String},
      databaseTotal: { type: Number },
      databaseResults: { type: Array }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.orgName = '';
    this.databaseTotal = 0;
    this.databaseResults = [];

    this.idGen = new IdGenerator({randomPrefix: true});
    this.dataCtl = new PageDataController(this);
    this.queryCtl = new QueryParamsController(this, [
      {name: 'orderBy', defaultValue: 'rank'},
      {name: 'text', defaultValue: ''},
      {name: 'limit', defaultValue: 10, type: 'number'},
      {name: 'offset', defaultValue: 0, type: 'number'}
    ]);

    this._injectModel('AppStateModel', 'OrganizationModel', 'DatabaseModel');
  }

  /**
   * @description Callback for when the app state is updated
   * @param {Object} e - app state update event
   * @returns
   */
  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    await this.queryCtl.setFromLocation();
    this.orgName = e.location?.path?.[1] || '';
    this.dataCtl.isAdmin = false;

    // set up database search query
    const searchOpts = {
      organization: this.orgName,
      orderBy: this.queryCtl.orderBy.getProperty(),
      offset: this.queryCtl.offset.getProperty(),
      limit: this.queryCtl.limit.getProperty(),
      excludeFeatured: true
    };
    if ( this.queryCtl.text.getProperty() ){
      searchOpts.text = this.queryCtl.text.getProperty();
      delete searchOpts.excludeFeatured;
    }

    // get data
    await this.dataCtl.get([
      {
        request: this.OrganizationModel.get(this.orgName),
        ctlProp: 'org',
        errorMessage: 'Unable to load organization'
      },
      {
        request: this.DatabaseModel.getFeaturedList(this.orgName),
        ctlProp: 'featured',
        errorMessage: 'Unable to load featured databases'
      },
      {
        request: this.DatabaseModel.search(searchOpts),
        hostCallback: '_onSearchSuccess',
        returnedResponse: 'request',
        errorMessage: 'Unable to load organization databases'
      },
      {
        request: this.OrganizationModel.isAdmin(this.orgName),
        ignoreError: true,
        hostCallback: '_onAdminCheck'
      }
    ]);
  }

  _onSearchSuccess(e) {
    const data = this.DatabaseModel.getSearchResult(e.id).payload;
    this.databaseTotal = data.total;
    this.databaseResults = data.items;
  }

  _onAdminCheck(e){
    this.dataCtl.isAdmin = e.isAdmin;
    this.requestUpdate();
  }

  async showEditModal() {
    if ( !Object.keys(this.dataCtl.org).includes('logo') ){
      const response = await fetch(this.OrganizationModel.getLogoUrl(this.orgName));
      if ( response.status === 404 ) {
        this.dataCtl.org.logo = null;
      } else if ( !response.ok ) {
        this.AppStateModel.showError({message: 'Unable to load logo'});
        return;
      } else {
        const blob = await response.blob();
        this.dataCtl.org.logo = await blobUtils.toBase64(blob);
      }
    }
    this.AppStateModel.showDialogModal({
      title: `Edit Organization: ${this.dataCtl.org?.title}`,
      actions: [
        {text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'},
        {text: 'Save Changes', value: 'org-metadata-save', color: 'secondary', disableOnLoading: true}
      ],
      content: html`<admin-org-metadata-form .org=${this.dataCtl.org}></admin-org-metadata-form>`,
      actionCallback: this._onModalAction
    });
  }

  async _onModalAction(action, modalEle){
    if ( action === 'org-metadata-save' ) {
      const form = modalEle.renderRoot.querySelector('admin-org-metadata-form');
      if ( !form.reportValidity() ) return {abortModalAction: true};
      modalEle._loading = true;
      const r = await form.submit();
      modalEle._loading = false;
      form.org = {};
      if ( r ) this.AppStateModel.refresh();
    }
  }

}

customElements.define('app-organization', AppOrganization);
