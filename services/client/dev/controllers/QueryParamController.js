import { Registry } from '@ucd-lib/cork-app-utils';

/**
 * @description Controller that manages a url query param on a host element
 * @property {String} host - the host element
 * @property {String} queryParam - the url query parameter key
 * @property {Object} opts - optional options
 * @property {String} opts.hostProperty - will set the designated property on the host element instead of the controller value
 */
export default class QueryParamController {
  constructor(host, queryParam, opts={}) {
    this.host = host;
    host.addController(this);
    this.AppStateModel = Registry.getModel('AppStateModel');

    this.queryParam = queryParam;
    this.hostProperty = opts.hostProperty;
    this.value = '';
    this.defaultValue = opts.defaultValue || '';
  }

  /**
   * @description Sets the host/controller property based on the current url query param value
   * @returns {Promise}
   */
  async setFromLocation(){
    if ( !this.queryParam ) return;
    let appState = await this.AppStateModel.get();
    this.setProperty(appState?.location?.query?.[this.queryParam]);
  }

  /**
   * @description Set app location based on current property value
   * @returns {Promise}
   */
  async setLocation(){
    if ( !this.queryParam ) return;
    let appState = await this.AppStateModel.get();
    const queryParams = new URLSearchParams(appState?.location?.query);
    const value = this.getProperty();
    if ( value === this.defaultValue ) {
      queryParams.delete(this.queryParam);
    } else {
      queryParams.set(this.queryParam, value);
    }
    const qs = queryParams.toString();
    this.AppStateModel.setLocation(`${appState.location.pathname}${qs ? '?'+qs : ''}`);
  }

  /**
   * @description Get the current property value
   * @returns {*} - the current property value
   */
  getProperty(){
    if ( !this.queryParam ) return;
    if ( this.hostProperty ) {
      return this.host[this.hostProperty] || this.defaultValue;
    }
    return this.value || this.defaultValue;
  }

  /**
   * @description Set the property value
   * @param {*} value - the value to set the property to
   * @param {Boolean} setLocation - whether to set the app location based on the new value
   * @returns
   */
  setProperty(value, setLocation=false){
    if ( !this.queryParam ) return;
    value = value || this.defaultValue;
    if ( this.hostProperty ) {
      this.host[this.hostProperty] = value;
    } else {
      this.value = value;
      this.host.requestUpdate();
    }
    if ( setLocation ) this.setLocation();
  }

  equals(value){
    return this.getProperty() === value;
  }
}
