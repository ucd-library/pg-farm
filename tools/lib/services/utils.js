import {config} from '../config.js';

class ServiceUtils {
  async checkRequesting(id, store, request) {
    let item = store.get(id);
    
    if( item && item.state === this.store.STATE.LOADING ) {
      await item.request;
    } else {
      await request();
    }
  }

  authHeader(headers={}) {
    if( config.tokenHash ) {
      headers['Authorization'] = `Bearer ${config.tokenHash}`;
    }

    return headers;
  }
}

const utils = new ServiceUtils();
export default utils;