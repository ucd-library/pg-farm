import { LitElement } from 'lit';
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import {render, styles} from "./app-database.tpl.js";
import {logger} from '../../src/index.js';

import '../components/database-admin/database-admin.js';

export default class AppDatabase extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      view : {type: Object}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.page = 'db';
    this.logger = logger('app-database');

    this._injectModel('AppStateModel', 'AdminModel');
    this.AppStateModel.get().then(e => this._onAppStateUpdate(e));
  }

  /**
   * @method _onAppStateUpdate
   * @description handle app state updates. Path route structure is:
   * 
   * base view:
   * /db/:organization/:database
   * 
   * sub views:
   * /db/:organization/:database/schema/:schema
   * /db/:organization/:database/schema/:schema/table/:table
   * /db/:organization/:database/schema/:schema/user/:username
   * 
   * 
   * @param {*} e 
   * @returns 
   */
  _onAppStateUpdate(e) {
    if( e.page !== this.page ) {
      return;
    }
    if( this.renderedPath === e.location.pathname ) {
      return;
    }
    this.renderedPath = e.location.pathname;

    let [page, organization, database, subPage, subPageValue, subPageView, subPageViewValue] 
      = e.location.path;

    this.view = {
      organization, 
      database, 
      subPage,
      subPageValue, 
      subPageView, 
      subPageViewValue
    };

    this.logger.info('view update', this.view);
  }

}

customElements.define('app-database', AppDatabase);