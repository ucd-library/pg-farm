import { LitElement } from 'lit';
import {render, styles} from "./app-search.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import QueryParamsController from '@ucd-lib/pgfarm-client/controllers/QueryParamsController.js';
import PageDataController from '@ucd-lib/pgfarm-client/controllers/PageDataController.js';
import IdGenerator from '@ucd-lib/pgfarm-client/utils/IdGenerator.js';

/**
 * @description - Page for searching databases
 * @property {String} pageId - The id of the page.
 * @property {Number} total - The total number of search results.
 * @property {Array} results - The search results.
 * @property {Array} organizations - The list of organizations for filtering.
 * @property {Array} tags - The list of tags for filtering.
 */
export default class AppSearch extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      total: { type: Number },
      results: { type: Array },
      organizations: { type: Array },
      tags: { type: Array },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.dataCtl = new PageDataController(this);
    this.queryCtl = new QueryParamsController(this, [
      {name: 'orderBy', defaultValue: 'rank'},
      {name: 'limit', defaultValue: 10, type: 'number'},
      {name: 'offset', defaultValue: 0, type: 'number'}
    ]);
    this.total = 0;
    this.results = [];
    this.organizations = [];
    this.tags = [];

    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  async _onAppStateUpdate(e) {
    if ( e.page !== this.pageId ) return;
    await this.queryCtl.setFromLocation();
    await this.dataCtl.get([
      {
        request: this.DatabaseModel.search(e.location.query),
        hostCallback: '_onSearchSuccess',
        returnedResponse: 'request',
        errorMessage: 'Error when performing database search'
      },
      {
        request: this.DatabaseModel.aggs(['organization', 'tag'], e.location.query),
        hostCallback: '_onAggsSuccess',
        returnedResponse: 'request',
        errorMessage: 'Error when retrieving database search aggregations'
      }
    ])
  }

  _onSearchSuccess(e) {
    const data = this.DatabaseModel.getSearchResult(e.id).payload;
    this.total = data.total;
    this.results = data.items;
  }

  _onAggsSuccess(e){
    const data = this.DatabaseModel.getAggResult(e.id).payload;
    this.organizations = data.find(agg => agg.key === 'organization')?.items || [];
    this.tags = data.find(agg => agg.key === 'tag')?.items || [];
  }

}

customElements.define('app-search', AppSearch);
