import { LitElement } from 'lit';
import {render, styles} from "./app-docs.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';
import markdownit from 'markdown-it'

const md = markdownit();
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
    this.render = render.bind(this);
    this._injectModel('AppStateModel');
  }

  _onAppStateUpdate(e) {
    if( e.page !== 'docs' ) {
      return;
    }

    if( this.renderedPath === e.location.pathname ) {
      return;
    }
    this.getDocs(e.location.pathname);
  }

  async getDocs(path) {
    if( !path.startsWith('/docs') ) {
      path = '/docs' + path;
    }

    if( cache[path] ) {
      return Promise.resolve(cache[path]);
    }

    let resp = await fetch(`https://storage.googleapis.com/${APP_CONFIG.gcsBucketAssets}${path}.md`)
    let text = await resp.text();
    this.content = md.render(text);
    cache[path] = this.content;

    this.AppStateModel.hideLoading();

    return this.content;
  }

}

customElements.define('app-docs', AppDocs);