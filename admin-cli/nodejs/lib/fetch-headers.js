import {config} from './config.js';

function getHeaders(headers={}) {
  if( config.token ) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  return headers;
}

export default getHeaders;