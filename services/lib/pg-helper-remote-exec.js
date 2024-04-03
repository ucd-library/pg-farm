import config from "./config.js";
import fetch from "node-fetch";
import logger from "./logger.js";

/**
 * @function remoteExec
 * @description Executes a command on a remote pg farm instance pod
 * on the pg-helper container.  All commands default to POST requests.
 * 
 * @param {String} hostname hostname of the pg farm instance 
 * @param {String} path api path to execute 
 * @param {String} fetchOpts fetch options
 *  
 * @returns {Promise<Object>}
 */
async function remoteExec(hostname, path, fetchOpts={}) {
  if( !fetchOpts.method ) {
    fetchOpts.method = 'POST';
  }
  const url = `http://${hostname}:${config.pgHelper.port}${path}`;
  return fetch(url, fetchOpts)
    .catch(e => {
      logger.error(`Error remote exec pg helper ${url}`, e);
    });
}

export default remoteExec;