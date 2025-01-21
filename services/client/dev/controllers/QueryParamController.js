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
    this.valueType = opts.type || 'string';
    this.isArray = opts.isArray || false;

    if ( opts.defaultValue === undefined ) {
      if ( this.valueType === 'number' ) {
        this.defaultValue = 0;
      } else if ( this.isArray ) {
        this.defaultValue = [];
      } else {
        this.defaultValue = '';
      }
    } else {
      this.defaultValue = opts.defaultValue;
    }
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
  async setLocation(opts={}){
    if ( !this.queryParam ) return;
    let appState = await this.AppStateModel.get();
    const queryParams = new URLSearchParams(appState?.location?.query);
    const value = this.getProperty();
    if ( value === this.defaultValue || this.isArray && !value?.length ) {
      queryParams.delete(this.queryParam);
    } else {
      queryParams.set(this.queryParam, value);
    }
    if ( opts.resetOffset ) {
      queryParams.delete('offset');
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
    if ( this.isArray ) {
      value = Array.isArray(value) ? value : value.split(',');
    }
    if ( this.valueType === 'number' ) {
      value = this.isArray ? value.map(v => Number(v)) : Number(value);
    } else if ( this.valueType === 'string') {
      value = this.isArray ? value.map(v => String(v)) : String(value);
    }

    if ( this.hostProperty ) {
      this.host[this.hostProperty] = value;
    } else {
      this.value = value;
      this.host.requestUpdate();
    }
    if ( setLocation ) this.setLocation();
  }

  /**
   * @description Add/remove value from array property
   * @param {*} value - the value to toggle
   * @param {Boolean} setLocation - whether to set the app location based on the new value
   * @returns
   */
  toggleArrayValue(value, setLocation=true){
    if ( !this.queryParam || !this.isArray ) return;
    let current = this.getProperty();
    if ( !Array.isArray(current) ) current = [];
    if ( current.includes(value) ) {
      current = current.filter(v => v !== value);
    } else {
      current.push(value);
    }
    this.setProperty(current, setLocation);
  }

  equals(value){
    return this.getProperty() === value;
  }

  exists(){
    return this.getProperty() !== this.defaultValue;
  }
}
