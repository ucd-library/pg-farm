import client from '../../../lib/pg-admin-client.js';
import config from '../../../lib/config.js';
import kubectl from '../../../lib/kubectl.js';
import logger from '../../../lib/logger.js';
import modelUtils from './utils.js';

class Instance {

  constructor() {
    this.STATES = {
      CREATING : 'CREATING',
      RUN : 'RUN',
      SLEEP : 'SLEEP',
      ARCHIVE : 'ARCHIVE',
      ARCHIVING : 'ARCHIVING',
      RESTORING : 'RESTORING'
    };

    this.AVAILABLE_STATES = {
      'ALWAYS' : -1,
      'HIGH' : (1000 * 60 * 60 * 24 * 30), // 30 days
      'MEDIUM' : (1000 * 60 * 60 * 24 * 7), // 7 days
      'LOW' : (1000 * 60 * 60 * 24) // 1 days
    };

  }

  /**
   * @method getConnection
   * @description Returns a postgres user connection object for the
   * postgres database for a given instance name and organization
   * 
   * 
   * @param {*} nameOrId 
   * @param {*} orgNameOrId 
   * @returns 
   */
  async getConnection(nameOrId, orgNameOrId=null) {
    let instance = await this.get(nameOrId, orgNameOrId);

    let pgUser = {};
    try {
      pgUser = await this.models.user.get(nameOrId, orgNameOrId, config.pgInstance.adminRole);
    } catch(e) {}

    return {
      host : instance.hostname,
      port : instance.port,
      user : config.pgInstance.adminRole,
      database : 'postgres',
      password : pgUser.password || config.pgInstance.adminInitPassword
    };
  }

  async get(nameOrId, orgNameOrId) {
    return client.getInstance(nameOrId, orgNameOrId);
  }

  /**
   * @method getByDatabase
   * @description get instance by database name or id
   * 
   * @param {String} nameOrId database name or id
   * @param {Stromg} orgNameOrId organization name or id
   * 
   * @returns {Promise<Object>}
   */
  async getByDatabase(nameOrId, orgNameOrId) {
    let database = await this.models.database.get(nameOrId, orgNameOrId);
    return this.get(database.instance_id);
  }

  async exists(name, orgNameOrId) {
    try {
      let instance = await this.get(name, orgNameOrId);
      return instance;
    } catch(e) {}

    return false;
  }

  /**
   * @method create
   * @description create a new instance
   * 
   * @param {String} name name of the instance 
   * @param {Object} opts
   * @param {String} opts.description description of the instance
   * @param {String} opts.hostname hostname of the instance
   * @param {String} opts.organization Optional. name or ID of the organization 
   * 
   * @returns {Promise<Object>}
   */
  async create(name, opts) {
    
    // make sure instance's always start with 'inst-'
    // this lets us know its an instance and not a database by name
    if( name.startsWith('inst-') ) {
      name = name.replace(/^inst-/, '');
    }
    name = 'inst-'+name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

    let exists = await this.exists(name, opts.organization);
    if( exists ) {
      throw new Error('Instance already exists: '+name);
    }

    // look up organization name to use in hostname
    let orgName = '';
    if( opts.organization ) {
      let org = await this.models.organization.get(opts.organization);
      orgName = org.name+'-';
    }

    if( !opts.hostname ) {
      opts.hostname = orgName+name.replace(/^inst-/, '');
    } else {
      opts.hostname = orgName+opts.hostname.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    }
    opts.hostname = 'pg-inst-'+opts.hostname;

    logger.info('Creating instance', name, opts);
    await client.createInstance(name, opts);

    return this.get(name, opts.organization);
  }

  /**
   * @method initInstanceDb
   * @description Initialize the database pgfarm public user and postgres user
   * 
   * @param {String} nameOrId instance name or id 
   * @param {String} orgNameOrId organization name or id
   */
  async initInstanceDb(nameOrId, orgNameOrId) {
    // create postgres user to admin database, resets password
    try {
      logger.info('Ensuring postgres user', nameOrId)
      await this.models.user.create(nameOrId, orgNameOrId, 'postgres');
    } catch(e) {
      logger.warn(`Failed to create postgres user for database ${nameOrId} on instance ${orgNameOrId}/${nameOrId}`, e.message);
    }

    // add public user
    try {
      logger.info('Ensuring public user', nameOrId)
      await this.models.user.create(nameOrId, orgNameOrId, config.pgInstance.publicRole.username);
    } catch(e) {
      logger.warn(`Failed to create public user ${config.pgInstance.publicRole.username}: ${orgNameOrId}/${nameOrId}`, e.message);
    }
  }

  /**
   * @method updateInstance
   * @description update instance property, e.g. hostname, description
   * 
   * @param {String} nameOrId 
   * @param {String} orgNameOrId
   * @param {String} property 
   * @param {String} value 
   * @returns 
   */
  async updateInstance(nameOrId, orgNameOrId=null, property, value) {
    let organizationId = null;
    if( orgNameOrId ) {
      let org = await client.getOrganization(orgNameOrId);
      organizationId = org.organization_id;
    }

    return client.updateInstanceProperty(nameOrId, organizationId, property, value);
  }

  /**
   * @method setInstanceState
   * @description set the state of the instance
   * 
   * @param {String} nameOrId
   * @param {String} orgNameOrId 
   * @param {String} state 
   * @returns 
   */
  async setInstanceState(nameOrId, orgNameOrId=null, state) {
    return client.updateInstanceProperty(nameOrId, orgNameOrId, 'state', state);
  }

  /**
   * @method checkInstanceState
   * @description check if the instance is in the given state
   * 
   * @param {String} nameOrId Instance name or id
   * @param {String} orgNameOrId organization name or id
   * @param {String|Array} states instance state or array of states
   * 
   * @returns {Promise<Boolean>}
   */
  async checkInstanceState(nameOrId, orgNameOrId=null, states) {
    let instance = await this.get(nameOrId, orgNameOrId);
    if( !Array.isArray(states) ) {
      states = [states];
    }

    for( let state of states ) {
      if( instance.state === state ) {
        return true;
      }
    }

    return false;
  }

  async setInstanceConfig(nameOrId, orgNameOrId=null, name, value) {
    let organizationId = null;
    if( orgNameOrId ) {
      let org = await client.getOrganization(orgNameOrId);
      organizationId = org.organization_id;
    }

    return client.setInstanceConfig(nameOrId, organizationId, name, value);
  }

  /**
   * @method start
   * @description Starts a postgres instance and service in k8s
   * 
   * @param {String} instNameOrId PG Farm instance name or ID 
   * 
   * @returns {Promise}
   */
  async start(instNameOrId, orgNameOrId) {
    if( !config.k8s.enabled ) {
      logger.warn('K8s is not enabled, just setting state to RUN');
      this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.RUN);
      return;
    }

    let instance = await this.get(instNameOrId, orgNameOrId);
    let customProps = await client.getInstanceConfig(instNameOrId);
    let instanceImage = customProps.image || config.pgInstance.image;

    let hostname = instance.hostname;

    // Postgres
    let k8sConfig = modelUtils.getTemplate('postgres');
    k8sConfig.metadata.name = hostname;
    
    let spec = k8sConfig.spec;
    spec.selector.matchLabels.app = hostname;
    spec.serviceName = hostname;

    let template = spec.template;
    template.metadata.labels.app = hostname;

    let container = template.spec.containers[0];
    container.image = instanceImage;
    container.name = hostname;
    container.volumeMounts[0].name = hostname+'-ps';

    container = template.spec.containers[1];
    container.image = config.pgHelper.image;

    spec.volumeClaimTemplates[0].metadata.name = hostname+'-ps';

    let pgResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });
    logger.info('Applied instance k8s config', hostname);

    // Postgres Service
    k8sConfig = modelUtils.getTemplate('postgres-service');
    k8sConfig.metadata.name = hostname;
    k8sConfig.spec.selector.app = hostname;

    let pgServiceResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });
    logger.info('Applied instance k8s service config', hostname);


    await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.RUN);

    return {pgResult, pgServiceResult};
  }

  async stop(instNameOrId, orgNameOrId) {
    if( !config.k8s.enabled ) {
      logger.warn('K8s is not enabled, just setting state to SLEEP');
      await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.SLEEP);
      return;
    }

    let instance = await this.get(instNameOrId, orgNameOrId);
    let hostname = instance.hostname;

    let pgResult, pgServiceResult;

    try {
      pgResult = await kubectl.delete('statefulset', hostname);
    } catch(e) {
      logger.warn('Error deleting statefulset', e.message);
      pgResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    try {
      pgServiceResult = await kubectl.delete('service', hostname);
    } catch(e) {
      logger.warn('Error deleting service', e.message);
      pgServiceResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.SLEEP);

    return  {pgResult, pgServiceResult};
  }




}

const instance = new Instance();
export default instance;