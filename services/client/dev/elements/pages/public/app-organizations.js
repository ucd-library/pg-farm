import { LitElement } from 'lit';
import { render, styles } from "./app-organizations.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';

export default class AppOrganizations extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: {type: String, attribute: 'page-id'},
      orgs: {type: Array},
      total: {type: Number}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.dataCtl = new PageDataController(this);
    this.orgs = [];
    this.total = 0;

    this._injectModel('AppStateModel', 'OrganizationModel');
  }

  /**
   * @description Callback for when the app state is updated
   * @param {Object} e - app state update event
   * @returns
   */
  async _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;

    await this.dataCtl.get([
      {
        request: this.OrganizationModel.search(),
        hostCallback: '_onSearchSuccess',
        returnedResponse: 'request',
        errorMessage: 'Unable to load organizations'
      }
    ]);
  }

  _onSearchSuccess(e) {
    const data = this.OrganizationModel.getSearchResult(e.id).payload;
    this.total = data.total;
    this.orgs = data.items;
  }

}

customElements.define('app-organizations', AppOrganizations);
