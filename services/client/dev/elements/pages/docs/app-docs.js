import { LitElement } from 'lit';
import {render, styles} from "./app-docs.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

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

  async _onAppStateUpdate(e) {
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

    await this.getDocs(e.location.pathname);

    requestAnimationFrame(() => {
      this._appendTextCopyButtons();
    });
  }

  async scrollToHash() {
    if( !this.hash ) {
      return;
    }

    const el = this.querySelector("#"+this.hash);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 100,
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

    this.content = text;
    cache[path] = this.content;

    this.AppStateModel.hideLoading();

    requestAnimationFrame(() => {
      setTimeout(() => {
        this.scrollToHash();
      }, 500);
    });

    return this.content;
  }

  /**
   * @description Append copy buttons to code blocks in the documentation markdown
   */
  _appendTextCopyButtons() {
    if( this.copyIconsAdded ) return;

    this.querySelectorAll('#md pre > code').forEach((codeBlock) => {
      const pre = codeBlock.parentNode;
      const appIcon = document.createElement('app-icon-button');
      appIcon.icon = 'fa.solid.copy';
      appIcon.basic = true;
      appIcon.style.padding = '0 0 1rem .5rem';

      // copy text action
      appIcon.addEventListener('click', () => {
        navigator.clipboard.writeText(codeBlock.innerText)
          .then(() => {
            appIcon.icon = 'fa.solid.check';
            setTimeout(() => (appIcon.icon = 'fa.solid.copy'), 2000);
          })
          .catch(() => {
            appIcon.icon = 'fa.solid.xmark';
          });
        appIcon.blur();
      });

      // wrapper for styles
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';  

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(appIcon);
    });
    this.copyIconsAdded = true;
  }

}

customElements.define('app-docs', AppDocs);