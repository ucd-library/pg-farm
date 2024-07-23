import { LitElement } from 'lit';
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import {render, styles} from "./app-search.tpl.js";

export default class AppSearch extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      items : {type: Array},
      total : {type: Number},
      resultStartIndex : {type: Number},
      resultEndIndex : {type: Number},
      loading : {type: Boolean}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.page = 'search';

    this.resetSearch();

    this.items = [];
    this.total = 0;
    this.resultStartIndex = 0;
    this.resultEndIndex = 0;
    this.loading = true;

    this._injectModel('AppStateModel', 'SearchModel');
    this.AppStateModel.get().then(e => this._onAppStateUpdate(e));
  }

  resetSearch() {
    this.searchParams = {};
  }

  _onAppStateUpdate(e) {
    if( e.page !== this.page ) {
      return;
    }

    this.searchParams = e.location.query;
    this.runSearch();
  }

  async runSearch() {
    let queryKey = JSON.stringify(this.searchParams);
    if( this.currentSearch === queryKey ) {
      return;
    }
    this.currentSearch = queryKey;

    this.loading = true;
    let resp = await this.SearchModel.search(this.searchParams);

    this.items = resp.items;
    this.total = resp.total;
    this.resultStartIndex = resp.query.offset+1;
    this.resultEndIndex = resp.query.limit;
    this.loading = false;
  }

  _onInputKeyup(e) {
    if( e.which !== 13 ) return;
    this.searchParams.text = e.target.value;
    this._updateLocation();
  }

  _updateLocation() {
    let searchParams = new URLSearchParams();
    for( let key in this.searchParams ) {
      searchParams.set(key, this.searchParams[key]);
    }

    this.AppStateModel.setLocation('/search?'+searchParams.toString()); 
  }
}

customElements.define('app-search', AppSearch);