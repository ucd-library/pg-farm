import { getLogger } from '@ucd-lib/cork-app-utils';

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
      ...opts,
    }

    this.update();
  }

  hostUpdate(){
    if ( this.hostData !== this.host[this.hostDataProp] ){
      this.hostData = this.host[this.hostDataProp];
      this.update();
    }
  }

  update(){
    this.logger.debug('update', this.hostData);
    this.data = (this.hostData || []).map( item => {
      const out = {
        item,
        hidden: !this._itemContainsSearchValue(item),
        selected: false
      };
      return out;
    } );
    this.host.requestUpdate();
  }

  getRows(){
    const d = this.data.filter( item => !item.hidden );
    return d.map( (item, i) => {
      item.index = i;
      item.even = i % 2 === 0;
      item.first = i === 0;
      item.last = i === d.length-1;
      return item;
    });
  }

  getRowCt(){
    return this.getRows().length;
  }

  _itemContainsSearchValue(item){
    if ( !this.opts.searchValue ) return true;
    const searchValue = this.opts.searchValue.toLowerCase();
    return this.opts.searchProps.some( prop => {
      return (item[prop]|| '').toLowerCase().includes(searchValue);
    } );
  }

  search(value){
    console.log('search', value);
    this.opts.searchValue = (value || '').toLowerCase();
    this.data.forEach( item => {
      item.hidden = !this._itemContainsSearchValue(item.item);
    });
    this.host.requestUpdate();
  }
}
