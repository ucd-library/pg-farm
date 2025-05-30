import { LitElement } from 'lit';
import {render, styles} from "./app-subnav.tpl.js";
import {Mixin} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

/**
 * @typedef {Object} SubnavItem
 * @property {String} label - Label for the item
 * @property {Array<SubnavItem>} [children] - Optional. Array of child items
 * @property {String} [icon] - Optional. Icon for the item
 * @property {String} [href] - Optional. If present, an a tag will be rendered with the href. Otherwise listen to the app-subnav-item-click event
 */

/**
 * @description Subnav component for the application
 * @property {String} heading - Optional. Heading for the subnav.
 * @property {(Array<string|SubnavItem>)} items - Array of items to display in the subnav. Can be strings or objects
 * @property {Function} selectedFn - Optional. Function to determine if an item is selected.
 * @fires app-subnav-item-click - Event fired when an item is clicked if no href is present
 */
export default class AppSubnav extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      heading: { type: String },
      items: { type: Array },
      selectedFn: { state: true },
      _items: { state: true }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.heading = '';
    this.items = [];
    this._items = [];
    this.selectedFn = () => {};

    this._injectModel('AppStateModel');
  }

  _onAppStateUpdate(){
    this.doSelected();
  }

  willUpdate(props){
    if (props.has('items') || props.has('selectedFn')){
      this.parseItems();
    }
  }

  parseItems(){
    const items = [];
    this.items.forEach(item => {
      this._parseItem(item, items);
    });
    this._items = items;
    this.doSelected();
  }

  _parseItem(item, items, parent){
    if (typeof item === 'string') {
      item = { label: item };
    }
    item = { ...item };
    if (!item.label) {
      item.label = '';
      logger.warn('Item missing label', item);
    }
    item.parent = parent;
    if ( item.parent && !item.icon ){
      icon = 'fa.solid.arrow-turn-up';
    }
    items.push(item);

    if (Array.isArray(item.children)) {
      item.children = item.children.map(child => this._parseItem(child, items, item));
    }
    return item;
  }

  async doSelected(){
    let schema = this.AppStateModel.location.query?.schema; // ?schema=x
    for (const item of this._items) {
      const selected = this.selectedFn(item);
      item.selected = await Promise.resolve(selected) ? true : false;
      if( ['users', 'tables'].includes(item.label.toLowerCase()) && schema ){
        item.href += '?schema=' + schema;
      }
    }
    this.requestUpdate();
  }

  _onItemClick(e, item){
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('app-subnav-item-click', {
      detail: { item }
    }));
  }

}

customElements.define('app-subnav', AppSubnav);
