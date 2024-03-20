import kubectl from '../lib/kubectl.js';
import config from '../lib/config.js';
import utils from '../lib/utils.js';
import pgClient from '../lib/pg-admin-client.js'

const INST_REGEX = /^inst-/;
const REST_REGEX = /^rest-/;

class HealthProbe {

  constructor() {
    // current tcp status of running pods
    this.tcpStatus = {
      rest : {},
      inst : {}
    }

    // running pod services
    this.services = {
      rest : [],
      inst : []
    }
  }

  start() {
    this.checkAlive();
    setInterval(() => this.checkAlive(), config.healthProbe.interval);
  }

  /**
   * @method getStatus
   * @description Get the current status of a given instance.  This includes db state
   * and tcp status of both pg instance and pg rest services for each database on
   * the instance.
   * 
   * @param {String} nameOrId instance name or id 
   * @param {String} orgNameOrId organization name or id
   * @returns {Promise<Object>}
   */
  async getStatus(nameOrId='', orgNameOrId=null) {
    let databases = await pgClient.getInstanceDatabases(nameOrId, orgNameOrId);
    if( databases.length === 0 ) {
      throw new Error('Instance not found');
    }

    let dbStatus = {};
    databases.forEach((db) => {
      dbStatus[db.database_name] = this.tcpStatus.rest[db.pgrest_hostname];
    });

    return {
      timestamp : Date.now(),
      listServicesTimestamp : this.services.timestamp,
      instanceState : databases[0].instance_state,
      tcpStatus : {
        instance : this.tcpStatus.inst[databases[0].instance_hostname],
        pgRest : dbStatus
      }
    }
  }

  /**
   * @method getServices
   * @description Get the current pg and pg rest services from k8s.
   * Sets this.services and returns
   */
  async getServices() {
    let pods = await kubectl.getServices();

    this.services = {
      timestamp : Date.now(),
      rest : pods.filter((pod) => REST_REGEX.test(pod)),
      inst : pods.filter((pod) => INST_REGEX.test(pod))
    }

    return this.services;
  }

  /**
   * @method checkAlive
   * @description Check the current tcp status of the running pods
   * 
   * @returns {Promise<Object>}
   */
  async checkAlive() {
    let services = await this.getServices();

    let promises = [];
    services.rest.forEach((pod) => {
      promises.push(this.isAlive('rest', pod, config.pgRest.port));
    });
    services.inst.forEach((pod) => {
      promises.push(this.isAlive('inst', pod, config.pgInstance.port));
    });

    await Promise.all(promises);

    // remove any services that are no longer running
    for( let type in this.tcpStatus ) {
      for( let pod in this.tcpStatus[type] ) {
        if( this.services[type].indexOf(pod) === -1 ) {
          delete this.tcpStatus[type][pod];
        }
      }
    }

    return this.tcpStatus;
  }

  async isAlive(type, host, port) {
    let isAlive = await utils.isAlive(host, port);
    this.tcpStatus[type][host] = {timestamp: Date.now(), isAlive};
  }

}

export default HealthProbe