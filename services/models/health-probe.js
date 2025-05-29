import kubectl from '../lib/kubectl.js';
import config from '../lib/config.js';
import utils from '../lib/utils.js';
import logger from '../lib/logger.js';
import pgClient from '../lib/pg-admin-client.js'
import metrics from '../lib/metrics/index.js';
import { createContext, getContext } from '../lib/context.js';
import instance from './instance.js';
import pgRest from './pg-rest.js';
import {ValueType} from '@opentelemetry/api';

const INST_REGEX = /^inst-/;
const REST_REGEX = /^rest-/;

const metricRoot = 'pgfarm.instance.';
const STATES = ['CREATING', 'RUN', 'SLEEP', 'ARCHIVE', 'ARCHIVING', 'RESTORING'];

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

  /**
   * @method start
   * @description Start the health probe.  This will start the checkAlive method
   * and run it at the interval specified in the config.
   */
  start() {
    this.checkAlive({fixIssues: true});
    setInterval(() => this.checkAlive({fixIssues: true}), config.healthProbe.interval);
    
    if( !metrics.meterProvider ) {
      return;
    }

    const meter = metrics.meterProvider.getMeter('default');
    const instState = meter.createObservableGauge(metricRoot+'state',  {
      description: 'State of the instance',
      unit: '',
      valueType: ValueType.INT,
    });

    let stateMap = {};
    instState.addCallback(async result => {
      let instances = await this.allStatus();

      let lastStateMap = stateMap;
      stateMap = {};

      instances.forEach((instance) => {
        let alive = instance?.tcpStatus?.instance?.isAlive ? 'active' : 'dead';
        if( !stateMap[instance.state] ) {
          stateMap[instance.state] = {};
        }
        if( !stateMap[instance.state][alive] ) {
          stateMap[instance.state][alive] = 0;
        }
        stateMap[instance.state][alive]++;
      });

      for( let state in lastStateMap ) {
        for( let alive in lastStateMap[state] ) {
          if( lastStateMap[state][alive] <= 0 ) continue;

          if( !stateMap[state] ) {
            result.observe(0, {
              state, 
              tcpState: alive
            });
            continue
          }
          if( !stateMap[state][alive] ) {
            result.observe(0, {
              state, 
              tcpState: alive
            });
          }
        }
      }

      for( let state in stateMap ) {
        for( let alive in stateMap[state] ) {
          result.observe(stateMap[state][alive], {
            state, 
            tcpState: alive
          });
        }
      }
    });
  }


  /**
   * @method allStatus
   * @description Get the current status of all instances
   * 
   * @returns {Promise<Array>}
   **/
  async allStatus(ctx) {
    let instances = await this.models.instance.list()
    for( let i = 0; i < instances.length; i++ ) {
      instances[i] = await createContext({
        organization : instances[i].organization_id,
        instance : instances[i].name,
        requestor : ctx.requestor || 'pgfarm:health-probe'
      });
    }

    let promises = instances.map((ctx) => this.getStatus(ctx));
    return Promise.all(promises);
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
  async getStatus(ctx) {
    ctx = getContext(ctx);

    let instance = ctx.instance
    if( !instance ) {
      throw new Error('Instance not found');
    }

    let databases = await pgClient.getInstanceDatabases(ctx);
    if( databases.length === 0 ) {
      throw new Error('Instance has no databases');
    }

    let dbStatus = {};
    databases.forEach((db) => {
      dbStatus[db.name] = this.tcpStatus.rest[db.pgrest_hostname];
    });

    return {
      name : instance.name,
      id : instance.id,
      organizationId : instance.organization_id,
      timestamp : new Date().toISOString(),
      listServicesTimestamp : this.services.timestamp,
      state : instance.state,
      tcpStatus : {
        instance : this.tcpStatus.inst[instance.hostname],
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
      timestamp : new Date().toISOString(),
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
  async checkAlive(opts={}) {
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

    this.ensureRunning();

    return this.tcpStatus;
  }


  /**
   * @method ensureRunning
   * @description Ensure that all instances are running that are in a RUN state in the db.
   * Leverages the this.tcpStatus to determine if the instance is running.  Will start the
   * instance if the state is RUN but the tcp status is not active.
   */
  async ensureRunning() {
    if( this.ensureRunningActive ) return;
    this.ensureRunningActive = true;

    try {
      let instances = await instance.list({state: instance.STATES.RUN});
      for( let inst of instances ) {

        let iCtx = await createContext({
          organization : inst.organization_id,
          instance : inst.name,
          requestor : 'pgfarm:health-probe'
        });

        // check the tcp status of the instance
        // start the instance if it is not running
        if( this.tcpStatus.inst[inst.hostname]?.isAlive !== true ) {
          logger.info(`Instance is not running but in a RUN state.  Starting...`, iCtx.logSignal);
          await instance.start(iCtx);
          continue; // this will start the pgrest as well
        }

        let databases = await pgClient.getInstanceDatabases(iCtx);
        for( let db of databases ) {
          if( this.tcpStatus.rest[db.pgrest_hostname]?.isAlive !== true ) {
            let dbCtx = iCtx.clone();
            await dbCtx.update({database: db.name});
            logger.info(`Instance database pgrest is not running but instance in a RUN state.  Starting...`, dbCtx.logSignal);
            await pgRest.start(dbCtx);
          }
        }

      }
    } catch(e) {
      logger.error(e);
    }

    this.ensureRunningActive = false;
  }

  async isAlive(type, host, port) {
    let isAlive = await utils.isAlive(host, port);
    this.tcpStatus[type][host] = {
      timestamp: new Date().toISOString(), 
      isAlive
    };
  }

}

const inst = new HealthProbe();
export default inst;