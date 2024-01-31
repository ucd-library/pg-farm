import fetch from 'node-fetch';
import utils from './utils.js';
import adminModel from '../administration/src/models/admin.js';
import pgRestModel from '../administration/src/models/pg-rest.js';
import logger from './logger.js';
import config from './config.js';

class InstanceStartup {

  constructor() {
    this.state = {};
  }

  async start(database, instance, opts={}) {
    if( this.state[database] ) {
      return this.state[database].promise;
    }

    this.state[database] = {};
    this.state[database].promise = new Promise((resolve, reject) => {
      this.state[database].resolve = resolve;
      this.state[database].reject = reject;
    });

    let isPortAlive = await utils.isAlive(
      instance.hostname,
      instance.port
    );

    if (!isPortAlive) {
      logger.info('Port test failed, starting instance', database);
      
      let pgRestPromise = pgRestModel.start(database);

      await adminModel.startInstance(database);
      await utils.waitUntil(instance.hostname, instance.port);

      if( opts.waitForPgRest ) {
        await pgRestPromise;
        await utils.waitUntil('pgrest-'+instance.name, config.pgRest.port);
        await waitForPgRestDb('http://pgrest-'+instance.name, config.pgRest.port);
      }

      this.resolve(database);

      return true;
    }

    this.resolve(database);
    return false;
  }

  resolve(database) {
    this.state[database].resolve(database);
    delete this.state[database];
  }
}

/**
 * @function waitForPgRestDb
 * @description waits for the pgrest database to be ready.  PgRest service
 * may take a few seconds to start up after the database is ready.
 *  
 * @param {String} host 
 * @param {String} port 
 * @param {Number} maxAttempts defaults to 10 
 * @param {Number} delayTime default to 500ms
 */
async function waitForPgRestDb(host, port, maxAttempts=10, delayTime=500) {
  let isAlive = false;
  let attempts = 0;

  while( !isAlive && attempts < maxAttempts ) {
    let resp = await fetch(`${host}:${port}`);
    isAlive = (resp.status !== 503);
    
    if( !isAlive ) {
      attempts++;
      await utils.sleep(delayTime);
    }
  }
}


const instance = new InstanceStartup();
export default instance;