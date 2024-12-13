import { LitElement } from 'lit';
import {render, styles} from "./app-search.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import QueryParamsController from '../../../controllers/QueryParamsController.js';
import PageDataController from '../../../controllers/PageDataController.js';
import IdGenerator from '../../../utils/IdGenerator.js';

export default class AppSearch extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
      total: { type: Number },
      results: { type: Array },
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

    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  async _onAppStateUpdate(e) {
    if ( e.page !== this.pageId ) return;
    await this.queryCtl.setFromLocation();
    await this.dataCtl.get([
      {request: this.DatabaseModel.search(e.location.query), hostCallback: '_onSearchSuccess', returnedResponse: 'request'}
    ])
  }

  _onSearchSuccess(e) {
    const data = this.DatabaseModel.getSearchResult(e.id).payload;
    console.log(data);
    this.total = data.total;
    this.results = data.items;

  }

}

customElements.define('app-search', AppSearch);
