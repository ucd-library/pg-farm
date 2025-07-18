import { LitElement } from 'lit';
import {render, styles} from "./pgfarm-app.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

// inject global styles
import '../css/index.js';

// sets globals Mixin and EventInterface
import "@ucd-lib/cork-app-utils";

// global brand components
import '@ucd-lib/theme-elements/brand/ucd-theme-primary-nav/ucd-theme-primary-nav.js';
import '@ucd-lib/theme-elements/brand/ucd-theme-header/ucd-theme-header.js';
import '@ucd-lib/theme-elements/ucdlib/ucdlib-branding-bar/ucdlib-branding-bar.js';
import '@ucd-lib/theme-elements/brand/ucd-theme-quick-links/ucd-theme-quick-links.js'
import '@ucd-lib/theme-elements/brand/ucd-theme-search-form/ucd-theme-search-form.js'
import '@ucd-lib/theme-elements/brand/ucd-theme-search-popup/ucd-theme-search-popup.js'
import '@ucd-lib/theme-elements/ucdlib/ucdlib-pages/ucdlib-pages.js';
import '@ucd-lib/theme-elements/brand/ucd-theme-pagination/ucd-theme-pagination.js';

import {config} from '../../../../tools/lib/index.js';

// global app components
import './components/app-build-info/app-build-info.js';
import './components/app-icon/app-icon.js';
import './components/app-icon-button/app-icon-button.js';
import './components/app-prefixed-icon-button/app-prefixed-icon-button.js';
import './components/app-loader/app-loader.js';
import './components/app-error/app-error.js';
import './components/app-dialog-modal/app-dialog-modal.js';
import './components/app-toast/app-toast.js';

import bundles from './pages/bundles/index.js';

// import './pages/app-database.js';

export default class PgfarmApp extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      page : {type: String},
      pathInfo: { type: String },
      siteSearchValue: { type: String },
      userDatabases : { type: Array },
      _firstAppStateUpdate : { state: true }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.loadedBundles = {};

    this._firstAppStateUpdate = false;

    this.page = config.isNativeApp ? 'native-home' : 'home';
    this.pathInfo = '';
    this.siteSearchValue = '';
    this.userDatabases = [];

    this._injectModel('AppStateModel', 'UserModel');
    this.AppStateModel.showLoading();
    this.AppStateModel.refresh();
  }

  async _onAppStateUpdate(e) {
    if( e.location.hash === 'logout' && 
        config.isNativeApp ){
      this._nativeLogout();
    }

    if ( !this._firstAppStateUpdate ) {
      this._firstAppStateUpdate = true;

      setTimeout(() => {
        
        document.querySelector('#site-loader').style.display = 'none';
        this.style.display = 'block';

      }, 500);
    }
    this.closeNav();
    const { page, location } = e;
    if( page === this.page && page !== 'home' ) return;

    this.AppStateModel.showLoading();
    this.pathInfo = location.pathname;

    const bundle = this._getBundleName(page);
    let bundleAlreadyLoaded = true;

    // dynamically load code
    if ( !this.loadedBundles[bundle] ) {
      bundleAlreadyLoaded = false;
      this.loadedBundles[bundle] = this._loadBundle(bundle, page);
    }
    if ( !this.loadedBundles[bundle] ) return;
    await this.loadedBundles[bundle];

    // requested page element might also be listening to app-state-update
    // in which case we need to fire it again
    if ( !bundleAlreadyLoaded ){
      this.AppStateModel.refresh();
      return;
    }

    this.siteSearchValue = page === 'search' ? location.query.text || '' : '';

    // timeout to allow page element to render
    setTimeout(() => {
      if( this.page !== page ) {
        this.page = page;
        if( !e.location.hash ) {
          window.scroll(0,0);
        }
      }
    }, 200);
  }

  /**
   * @description Get name of bundle a page element is in
   * @param {String} page
   * @returns {String}
   */
  _getBundleName(page){
    for (const bundle in bundles) {
      if ( bundles[bundle].includes(page) ){
        return bundle;
      }
    }
    return '';
  }

  _onSearch(e){
    this.AppStateModel.setLocation(`/search?text=${encodeURIComponent(e.detail.searchTerm)}`);
    this.renderRoot.querySelector('ucd-theme-search-popup').close();
  }

  /**
   * @description code splitting done here
   *
   * @param {String} bundle bundle to load
   * @param {String} page page to load. Just used for error logging.
   *
   * @returns {Promise}
   */
  _loadBundle(bundle, page='') {

    if( bundle == 'public' ) {
      return import(/* webpackChunkName: "public" */ "./pages/bundles/public.js");
    } else if( bundle == 'admin' ) {
      return import(/* webpackChunkName: "admin" */ "./pages/bundles/admin.js");
    } else if( bundle == 'native' ) {
      return import(/* webpackChunkName: "native" */ "./pages/bundles/native.js");
    } else if( bundle == 'docs' ) {
      return import(/* webpackChunkName: "docs" */ "./pages/bundles/docs.js");
    }
    this.logger.warn(`AppMain: bundle ${bundle} not found for page ${page}. Check pages/bundles/index.js`);
    return false;
  }

  /**
   * @description Close the app's primary nav menu
   */
  closeNav(){
    let ele = this.renderRoot.querySelector('ucd-theme-header');
    if ( ele ) {
      ele.close();
    }
    ele = this.renderRoot.querySelector('ucd-theme-quick-links');
    if ( ele ) {
      ele.close();
    }
  }

  async _nativeLogout() {
    await window.electronAPI.logout();
    this.AppStateModel.setLocation('/native/home');
    window.location.reload();
  }


}

customElements.define('pgfarm-app', PgfarmApp);
