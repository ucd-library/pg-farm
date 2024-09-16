import { LitElement } from 'lit';
import {render, styles} from "./pgfarm-app.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

// inject global styles
import sharedStyles from '@ucd-lib/theme-sass/style-ucdlib.css';
let sharedStyleElement = document.createElement('style');
sharedStyleElement.innerHTML = sharedStyles;
document.head.appendChild(sharedStyleElement);

// sets globals Mixin and EventInterface
import "@ucd-lib/cork-app-utils";

import '@ucd-lib/theme-elements/ucdlib/ucdlib-pages/ucdlib-pages.js'
import '@ucd-lib/theme-elements/brand/ucd-theme-header/ucd-theme-header.js'
import '@ucd-lib/theme-elements/brand/ucd-theme-primary-nav/ucd-theme-primary-nav.js'

import {appStateModel} from '../../../../tools/lib/index.js';
console.log(appStateModel);

import './pages/app-home.js';
import './pages/app-search.js';
import './pages/app-database.js';
import './components/footer/ucdlib-site-footer.js';

export default class PgfarmApp extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      page : {type: String},
      pathInfo: { type: String }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.page = 'home';
    this.pathInfo = '';


    this._injectModel('AppStateModel');
    this.AppStateModel.get().then(e => this._onAppStateUpdate(e));
  }

  _onAppStateUpdate(e) {
    if( e.page && e.page !== this.page ) {
      this.page = e.page;
    }

    this.pathInfo = e.location.pathname;
  }


}

customElements.define('pgfarm-app', PgfarmApp);