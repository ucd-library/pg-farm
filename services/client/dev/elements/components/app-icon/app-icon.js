import { LitElement } from 'lit';
import {render, styles} from "./app-icon.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';

/**
 * @description Load and displays an svg icon
 * @property {String} slug - the slug of the icon to load, e.g. fa.solid.user
 * @property {String} size - the size of the icon using brand spacer sizes: tiny, small, medium, large, huge
 * @property {String} fetchMethod - how to fetch the icon: property-change, page-load, manual
 * @property {Boolean} invisibleIfEmpty - Make no visible space for the icon if it is empty
 * @property {Boolean} autoHeight - By default the icon will be square, set to true to allow the icon to be its natural height
 * @property {String} svg - the svg content of the icon. Typically will be set by this element depending on the fetchMethod
 */
export default class AppIcon extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      slug: {type: String},
      size: {type: String},
      fetchMethod: {type: String, attribute: 'fetch-method'},
      invisibleIfEmpty: {type: Boolean, attribute: 'invisible-if-empty'},
      autoHeight: {type: Boolean, attribute: 'auto-height'},
      svg: {type: String},
      appPageId: {state: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.slug = '';
    this.size = '';
    this.svg = '';
    this.invisibleIfEmpty = false;
    this.autoHeight = false;
    this.fetchMethod = 'property-change';
    this._injectModel('IconModel', 'AppStateModel');
  }

  /**
   * @description lit lifecycle method when element will update
   * @param {Map} props - changed properties
   */
  willUpdate(props){
    if (props.has('slug') && this.fetchMethod == 'property-change' ){
      this.svg = '';
      if ( this.slug ){
        this.getSvg();
      }
    }
    if ( this.fetchMethod == 'page-load' && props.has('slug') ){
      this.svg = '';
      if ( this.slug && this.isOnActiveAppPage() ){
        this.getSvg();
      }
    }
  }

  /**
   * @description Get the svg for the icon using the IconModel
   */
  getSvg(){
    const cached = this.IconModel.getFromCache(this.slug);
    if ( cached?.[this.slug] ) {
      this.svg = cached;
      return;
    }
    this.IconModel.get(this.slug)
  }

  /**
   * @description Callback for when the icon model updates
   * @param {Object} e - cork-app-utils event object
   */
  _onIconGetUpdate(e){
    if ( e.state !== 'loaded' || !e.payload?.[this.slug] ) return;
    this.svg = e.payload[this.slug];
  }

  /**
   * @description Check if this element is on the active app page
   * @returns {Boolean}
   */
  isOnActiveAppPage(){
    let el = this;
    let pageId;
    while( el ) {
      if ( el.pageId ){
        pageId = el.pageId;
      }
      if( el.tagName === 'UCDLIB-PAGES' && el.id === 'app-pages' ) {
        this.appPageId = pageId;
        return el.selected === pageId;
      }
      if ( el.parentElement ){
        el = el.parentElement;
      } else if ( el.parentNode?.host ) {
        el = el.parentNode.host;
      } else {
        this.logger.warn('AppIcon: could not find app-pages element');
        return false;
      }
    }
  }

  /**
   * @description Callback for when the app state model updates
   * @param {Object} e - cork-app-utils event object
   */
  _onAppStateUpdate(e){
    if ( this.fetchMethod !== 'page-load' ) return;
    if ( !this.appPageId ) this.isOnActiveAppPage();
    if ( this.appPageId === e.page && !this.svg) {
      this.getSvg();
    }

  }
}

customElements.define('app-icon', AppIcon);
