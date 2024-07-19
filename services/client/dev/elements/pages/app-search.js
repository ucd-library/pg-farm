import { LitElement } from 'lit';
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import {render, styles} from "./app-search.tpl.js";

export default class AppSearch extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      
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

    let resp = await this.SearchModel.search(this.searchParams);
    console.log(resp);
  }


}

customElements.define('app-search', AppSearch);