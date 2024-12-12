import { LitElement } from 'lit';
import {render, styles} from "./app-search.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import QueryParamController from '../../../controllers/QueryParamController.js';
import IdGenerator from '../../../utils/IdGenerator.js';

export default class AppSearch extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.idGen = new IdGenerator({randomPrefix: true});
    this.orderByCtl = new QueryParamController(this, 'orderBy', {defaultValue: 'rank'});

    this._injectModel('AppStateModel', 'DatabaseModel');
  }

  async _onAppStateUpdate(e) {
    if ( e.page !== this.pageId ) return;

    // set input values from query params
    this.orderByCtl.setFromLocation();

    // todo show loader

    try {
      let { request, id } = this.DatabaseModel.search(e.location.query);
      await request;
      const resp = this.DatabaseModel.getSearchResult(id);
      console.log(resp);

    } catch (e){
      // todo: handle error
    }


    // todo show loaded

  }

}

customElements.define('app-search', AppSearch);
