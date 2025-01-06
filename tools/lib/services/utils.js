import {config} from '../config.js';

class ServiceUtils {

  authHeader(headers={}) {
    if( config.tokenHash ) {
      headers['Authorization'] = `Bearer ${config.tokenHash}`;
    }

    return headers;
  }

  /**
 * @description get the host of the current application
 * Ensures no trailing slash
 */
  get host(){
    return config.host.replace(/\/$/, '');
  }
}

const utils = new ServiceUtils();
export default utils;
