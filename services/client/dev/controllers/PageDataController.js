import { Registry } from '@ucd-lib/cork-app-utils';
import { WaitController } from "@ucd-lib/theme-elements/utils/controllers/wait.js";

/**
 * under development.
 * not sure if this even the direction i want to go.
 */
/**
 * @typedef {Object} RequestDefinition
 * @property {Promise|Object} request - The request to be executed. Can be a Promise or an object.
 * @property {Function} [func] - A function that returns a request. Used in batchGet method.
 * @property {string} [hostCallback] - The name of the host method to call with the response value after function completion.
 * @property {string} [hostProp] - The name of the host property to set with the response value.
 * @property {string} [ctlProp] - The name of the controller property to set with the response value.
 * @property {boolean} [ignoreError=false] - Whether to ignore errors for this request - aka don't show app error screen.
 * @property {string} [returnedResponse='payload'] - Determines which part of the response to use.
 * Can be 'payload', 'response', or 'request'.
 * @property {Object} [response] - The response object after the request is resolved or rejected.
 * @property {Function} [doHostCallback] - Internal function to execute the host callback with the response value.
 * @property {Function} [setHostProp] - Internal function to set the host property with the response value.
 * @property {Function} [setCtlProp] - Internal function to set the controller property with the response value.
 */
export default class PageDataController {

  constructor(host, opts={}) {
    this.host = host;
    host.addController(this);
    this.AppStateModel = Registry.getModel('AppStateModel');
    this.wait = new WaitController(this.host);

    this.opts = opts;
  }

  /**
   * @description Do API requests and update host properties
   * @param {Array<RequestDefinition>} requests - An array of request objects as defined above.
   * @param {Object} opts - Additional options for the API requests.
   * @returns {Promise<Array<RequestDefinition>} - A promise that resolves to an array of processed request objects.
   */
  async get(requests, opts={}){
    if ( !opts.ignoreLoading ){
      this.AppStateModel.showLoading();
    }

    requests = this._formatRequests(requests);
    await this._allSettled(requests);

    const errors = requests.filter(r => this._requestIsError(r) && !r.ignoreError);
    if ( errors.length ) {
      this.AppStateModel.showError({errors});
      return;
    }

    for( let r of requests ) {
      if ( this._requestIsError(r) ) continue;
      let value;
      if ( !r.returnedResponse || r.returnedResponse === 'payload' ){
        value = r.response?.value?.payload;
      } else if ( r.returnedResponse === 'response' ) {
        value = r.response?.value;
      } else if ( r.returnedResponse === 'request' ) {
        value = r.request;
      }

      if ( r.hostCallback ) {
        r.doHostCallback(value);
      }
      if ( r.hostProp ) {
        r.setHostProp(value);
      }
      if ( r.ctlProp ) {
        r.setCtlProp(value);
      }
    }

    this.wait.waitForUpdate();
    this.wait.waitForFrames(3);

    if ( !opts.ignoreLoading ) {
      this.AppStateModel.hideLoading();
    }

    return requests;

  }

  /**
   * @description get requests in batches, returns single array of results
   * @param {Array} requests - The same options as get method
   * except the 'func' prop should be used instead of 'request' e.g. func: () => this.DatabaseModel.get('foo', 'bar')
   * @param {Object} opts - options to pass to get method
   * @param {Number} batchSize - number of requests to send at once
   * @returns {Array} - array of results
   */
  async batchGet(requests, opts={}, batchSize=5) {
    // ensure func prop is set
    if ( !requests.every(r => r.func) ) {
      throw new Error('All requests must have a func prop');
    }

    // chunk requests
    const chunks = [];
    for ( let i = 0; i < requests.length; i += batchSize ) {
      chunks.push(requests.slice(i, i + batchSize));
    }

    // loop through chunks, call functions, and pass to get method
    const results = [];
    for ( const chunk of chunks ) {
      for ( const r of chunk ) {
        r.request = r.func();
      }
      const r = await this.get(chunk, opts);
      if ( !r ) return;
      results.push(...r);
    }

    return results;

  }

  async _allSettled(requests){
    const promises = requests.map(r => {
      if ( r.request?.request instanceof Promise ) {
        return r.request.request;
      }
      return r.request;
    });

    // merge into requests array
    const results = await Promise.allSettled(promises);
    for( let i = 0; i < results.length; i++ ) {
      requests[i].response = results[i];
    }
  }

  _requestIsError(request) {
    return request.response.status === 'rejected' ||
    request.response?.value?.state === 'error' ||
    request.response?.value?.error;
  }

  _formatRequests(requests) {
    const _requests = [];
    for ( const r of requests ) {
      if ( !r?.request ) {
        _requests.push({request: r});
      } else {
        if ( r.hostCallback ) {
          r.doHostCallback = (value) => {
            this.host[r.hostCallback](value);
          }
        }
        if ( r.hostProp ) {
          r.setHostProp = (value) => {
            this.host[r.hostProp] = value;
          }
        }
        if ( r.ctlProp ) {
          r.setCtlProp = (value) => {
            this[r.ctlProp] = value;
            this.host.requestUpdate();
          }
        }
        _requests.push(r);
      }
    }
    return _requests;
  }
}
