import { getLogger } from '@ucd-lib/cork-app-utils';

/**
 * @description Controller for managing a table of data
 * @property {Object} host - the host element that the controller is attached to
 * @property {String} hostDataProp - the property on the host element that contains the data to display
 * @property {Object} opts - options for the controller
 * @property {Array} opts.searchProps - the item properties to search on when performing a simple text search
 * @property {String} opts.searchValue - the current search value
 * @property {Array} opts.filters - an array of filters to apply to the data. Must contain an id, and either a 'prop' or cb properties
 */
export default class TableController {

  constructor(host, hostDataProp, opts={}) {
    this.host = host;
    host.addController(this);

    this.logger = getLogger('TableController');

    this.hostDataProp = hostDataProp;
    this.hostData = host[hostDataProp] || [];
    this.data = [];

    this.opts = {
      searchProps: ['name'],
      searchValue: '',
      filters: [],
      ...opts,
    }

    this.reset();
  }

  /**
   * @description Callback for when the host element updates
   */
  hostUpdate(){
    if ( this.hostData !== this.host[this.hostDataProp] ){
      this.hostData = this.host[this.hostDataProp];
      this.reset();
    }
  }

  /**
   * @description Reset the table to its initial state, and reload the data from the host element
   */
  reset(){
    this.logger.debug('update', this.hostData);

    // reset search and filters
    this.opts.searchValue = '';
    this.opts.filters.forEach( filter => filter.value = filter.defaultValue || '' );

    this.data = (this.hostData || []).map( item => {
      const row = {
        item,
        hidden: this._itemIsHidden(item),
        selected: false
      };
      row.toggleSelected = () => {
        row.selected = !row.selected;
        this.host.requestUpdate();
      }
      return row;
    } );
    this.host.requestUpdate();
  }

  /**
   * @description Get the rows to display in the table. Data will be in the item property.
   * @returns {Array}
   */
  getRows(){
    const d = this.data.filter( item => !item.hidden );
    return d.map( (item, i) => {
      item.index = i;
      item.even = i % 2 === 0;
      item.first = i === 0;
      item.last = i === d.length-1;
      item.classes = `row ${item.selected ? 'selected' : 'not-selected'}`;
      return item;
    });
  }

  /**
   * @description Returns the number of visible rows in the table
   * @returns {Number}
   */
  getRowCt(){
    return this.getRows().length;
  }

  /**
   * @description Search the table for the given value. Will search the searchProps defined in the opts
   * @param {*} value
   */
  search(value){
    this.opts.searchValue = (value || '').toLowerCase();
    this.data.forEach( item => {
      item.hidden = this._itemIsHidden(item.item);
    });
    this.host.requestUpdate();
  }

  /**
   * @description All rows are selected
   * @returns {Boolean}
   */
  allSelected(){
    const rows = this.getRows();
    if ( rows.length === 0 ) return false;
    return rows.every( item => item.selected );
  }

  /**
   * @description Toggle all visible rows to selected or not selected
   */
  toggleAllSelected(){
    const selected = !this.allSelected();
    this.getRows().forEach( item => item.selected = selected );
    this.host.requestUpdate();
  }

  /**
   * @description Get all visible selected data items
   * @returns {Array}
   */
  getSelectedItems(){
    return this.getRows().filter( item => item.selected ).map( item => item.item );
  }

  /**
   * @description Get the number of selected rows
   * @returns {Number} - The number of selected rows
   */
  getSelectedCount(){
    return this.getRows().filter( item => item.selected ).length;
  }

  /**
   * @description Set the value of a filter
   * @param {*} filterId - The unique identifier of the filter defined in controller initialization
   * @param {*} value
   * @returns
   */
  setFilterValue(filterId, value){
    const filter = this.opts.filters.find( f => f.id === filterId );
    if ( !filter ) {
      this.logger.warn('Filter not found', filterId);
      return;
    }
    filter.value = value;
    this.data.forEach( item => {
      item.hidden = this._itemIsHidden(item.item);
    });
    this.host.requestUpdate();
  }

  /**
   * @description Get the value of a filter
   * @param {*} filterId - The unique identifier of the filter defined in controller initialization
   * @returns
   */
  getFilterValue(filterId){
    const filter = this.opts.filters.find( f => f.id === filterId );
    if ( !filter ) {
      this.logger.warn('Filter not found', filterId);
      return;
    }
    return filter.value;
  }

  _itemContainsSearchValue(item){
    if ( !this.opts.searchValue ) return true;
    const searchValue = this.opts.searchValue.toLowerCase();
    return this.opts.searchProps.some( prop => {
      const propArr = prop.split('.');
      let value = item;
      for (const p of propArr) {
        value = value[p];
        if ( value === undefined ) return false;
      }
      return (value||'').toLowerCase().includes(searchValue);
    } );
  }

  _itemIsHidden(item){
    for (const filter of this.opts.filters) {
      if ( this._itemFilter(item, filter) ) return true;
    }
    return !this._itemContainsSearchValue(item);
  }

  _itemFilter(item, filter){
    if ( filter.cb ) return !filter.cb(item, filter.value);
    if ( filter.prop ) {
      const prop = filter.prop.split('.');
      let value = item;
      for (const p of prop) {
        value = value[p];
        if ( value === undefined ) return false;
      }
      return value !== filter.value;
    }
    this.logger.warn('Filter is missing prop or cb', filter);
    return false;
  }
}
