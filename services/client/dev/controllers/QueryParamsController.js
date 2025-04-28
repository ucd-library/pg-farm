import QueryParamController from "./QueryParamController";
import { getLogger } from '@ucd-lib/cork-app-utils';

export default class QueryParamsController {
  constructor(host, queryParams=[], opts={}) {
    this._host = host;
    host.addController(this);

    this.logger = getLogger('QueryParamsController');

    this.init(queryParams);
    this._opts = opts;
  }

  init(queryParams) {
    this._paramRegistry = [];
    queryParams.forEach(opts => {
      let ctlProp = opts.ctlProp || opts.name;
      this[ctlProp] = new QueryParamController(this._host, opts.name, opts);
      this._paramRegistry.push(this[ctlProp]);
    });
  }

  async setFromLocation(){
    await Promise.all(this._paramRegistry.map(param => param.setFromLocation()));
  }

  /**
   * @description Get the current page number based on offset and limit
   * @returns {Number}
   */
  getCurrentPage(){
    if ( this.limit === undefined ){
      this.logger.warn('getCurrentPage called before limit is set');
      return 1;
    }
    if ( this.offset === undefined ){
      this.logger.warn('getCurrentPage called before offset is set');
      return 1;
    }
    return Math.floor(this.offset.getProperty() / this.limit.getProperty()) + 1;
  }

  /**
   * @description Get the maximum page number based on total and limit
   * @param {Number} total - total number of items
   * @returns {Number}
   */
  getMaxPage(total){
    if( this.limit === undefined ){
      this.logger.warn('getMaxPage called before limit is set');
      return 1;
    }
    return Math.ceil(total / this.limit.getProperty());
  }

  /**
   * @description Set offset based on page number and limit
   * @param {Number} page - page number
   * @returns
   */
  setPage(page){
    if ( this.limit === undefined ){
      this.logger.warn('doPageChange called before limit is set');
      return;
    }
    this.offset.setProperty((page-1) * this.limit.getProperty(), true);
  }

}
