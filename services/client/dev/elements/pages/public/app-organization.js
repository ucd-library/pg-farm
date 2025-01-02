import { LitElement } from 'lit';
import { render, styles } from "./app-organization.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import PageDataController from '../../../controllers/PageDataController.js';
import QueryParamsController from '../../../controllers/QueryParamsController.js';
import IdGenerator from '../../../utils/IdGenerator.js';

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
      {request: this.OrganizationModel.get(this.orgName), ctlProp: 'org'},
      {request: this.DatabaseModel.getFeaturedList(this.orgName), ctlProp: 'featured'},
      {request: this.DatabaseModel.search(searchOpts), hostCallback: '_onSearchSuccess', returnedResponse: 'request'}
    ]);
  }

  _onSearchSuccess(e) {
    const data = this.DatabaseModel.getSearchResult(e.id).payload;
    this.databaseTotal = data.total;
    this.databaseResults = data.items;
  }

}

customElements.define('app-organization', AppOrganization);
