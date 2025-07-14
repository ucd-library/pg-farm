import { LitElement } from 'lit';
import {render, styles} from "./app-docs.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import markdownit from 'markdown-it'
import markdownitAnchor from 'markdown-it-anchor';

const md = markdownit();
md.use(markdownitAnchor, {});
const cache = {};

export default class AppDocs extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      content : { type: String },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    
    this.content = '';

    this.ASSETS_BASE_URL_TEMPLATE = '__BASE__';
    this.ASSETS_BASE_URL = APP_CONFIG.assetsBaseUrl;

    this.render = render.bind(this);
    this._injectModel('AppStateModel');
  }

  _onAppStateUpdate(e) {
    if( e.page !== 'docs' ) {
      return;
    }

    if( e.location.hash ) {
      this.hash = e.location.hash.replace('#', '');
      this.scrollToHash();
    }

    if( this.renderedPath === e.location.pathname ) {
      return;
    }

    this.getDocs(e.location.pathname);
  }

  async scrollToHash() {
    if( !this.hash ) {
      return;
    }

    const el = this.querySelector("#"+this.hash);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 60,
        behavior: 'smooth'
      });
    }
  }

  async getDocs(path) {
    if( !path.startsWith('/docs') ) {
      path = '/docs' + path;
    }

    if( cache[path] ) {
      this.AppStateModel.hideLoading();
      return Promise.resolve(cache[path]);
    }

    let resp = await fetch(`${this.ASSETS_BASE_URL}${path}.md`)
    let text = await resp.text();

    text = text.replaceAll(this.ASSETS_BASE_URL_TEMPLATE, this.ASSETS_BASE_URL);

    this.content = md.render(text);
    cache[path] = this.content;

    this.AppStateModel.hideLoading();

    requestAnimationFrame(() => {
      setTimeout(() => {
        this.scrollToHash();
      }, 500);
    });

    return this.content;
  }

}

customElements.define('app-docs', AppDocs);