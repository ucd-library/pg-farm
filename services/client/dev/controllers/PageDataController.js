import { Registry } from '@ucd-lib/cork-app-utils';

/**
 * under development.
 * not sure if this even the direction i want to go.
 */
export default class PageDataController {

  constructor(host, opts={}) {
    this.host = host;
    host.addController(this);
    this.AppStateModel = Registry.getModel('AppStateModel');

    this.opts = opts;
  }

  async get(requests, opts={}){
    // todo: show loader

    requests = this._formatRequests(requests);
    await this._allSettled(requests);


    const errors = requests.filter(r => r.response.status === 'rejected' || r.response?.value?.state === 'error');
    if ( errors.length ) {
      // todo: handle error
      return;
    }

    for( let r of requests ) {
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

    // todo: show loaded

    return requests;

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
