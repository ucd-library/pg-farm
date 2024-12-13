import QueryParamController from "./QueryParamController";

export default class QueryParamsController {
  constructor(host, queryParams, opts={}) {
    this._host = host;
    host.addController(this);

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

}
