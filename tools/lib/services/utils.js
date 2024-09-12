import {config} from '../config.js';

class ServiceUtils {

  authHeader(headers={}) {
    if( config.tokenHash ) {
      headers['Authorization'] = `Bearer ${config.tokenHash}`;
    }

    return headers;
  }
}

const utils = new ServiceUtils();
export default utils;