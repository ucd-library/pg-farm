import client from '../lib/pg-admin-client.js';
import config from '../lib/config.js';
import kubectl from '../lib/kubectl.js';
import logger from '../lib/logger.js';
import modelUtils from './utils.js';
import remoteExec from '../lib/pg-helper-remote-exec.js';

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
      'LOW' : (1000 * 60 * 60 * 12) // 12 hours
    };

  }

  /**
   * @method getConnection
   * @description Returns a postgres user connection object for the
   * postgres database for a given instance name and organization
   * 
   * 
   * @param {String} instNameOrId 
   * @param {String} orgNameOrId 
   * @returns 
   */
  async getConnection(instNameOrId, orgNameOrId=null) {
    let instance = await this.get(instNameOrId, orgNameOrId);

    let pgUser = {};
    try {
      pgUser = await this.models.user.get(instNameOrId, orgNameOrId, config.pgInstance.adminRole);
    } catch(e) {}

    return {
      host : instance.hostname,
      port : instance.port,
      user : config.pgInstance.adminRole,
      database : 'postgres',
      password : pgUser.password || config.pgInstance.adminInitPassword
    };
  }

  /**
   * @method list
   * @description list all instances
   * 
   * @param {String} state Optional.  Filter by state
   * 
   * @returns {Promise<Array>}
   **/
  list(state=null) {
    return client.getInstances(state);
  }

  /**
   * @method get
   * @description get instance by name or id.  The name can
   * omit the 'inst-' prefix and it will be added automatically.
   * 
   * @param {String} nameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * 
   * @returns {Promise<Object>}
   **/
  async get(nameOrId='', orgNameOrId=null) {
    if( !modelUtils.isUUID(nameOrId) && !nameOrId.match(/^inst-/) ) {
      nameOrId = 'inst-'+nameOrId;
    }
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

  /**
   * @method exists
   * @description check if an instance exists.  Wraps the get method
   * and catches the error if the instance does not exist.
   * 
   * @param {String} name instance name or id
   * @param {String} orgNameOrId organization name or id
   * 
   * @returns {Promise<Boolean>}
   **/
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
    name = 'inst-'+name
      .replace(/^inst-/, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-');
    
    let shortName = name.replace(/^inst-/, '');

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

    // if( !opts.hostname ) {
    //   opts.hostname = orgName+name.replace(/^inst-/, '');
    // } else {
    //   opts.hostname = orgName+opts.hostname.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    // }

    opts.hostname = 'inst-'+orgName+shortName;

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
      logger.info('Ensuring postgres user', orgNameOrId, nameOrId)
      await this.models.user.create(nameOrId, orgNameOrId, 'postgres');
    } catch(e) {
      logger.warn(`Failed to create postgres user for on instance ${orgNameOrId}/${nameOrId}`, e.message, e.stack);
    }

    // add public user
    try {
      logger.info('Ensuring public user', nameOrId)
      await this.models.user.create(nameOrId, orgNameOrId, config.pgInstance.publicRole.username);
    } catch(e) {
      logger.warn(`Failed to create public user ${config.pgInstance.publicRole.username}: ${orgNameOrId}/${nameOrId}`, e.message, e.stack);
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
   * @param {String} orgNameOrId PG Farm organization name or ID
   * @param {Object} opts
   * @param {Boolean} opts.isRestoring set to true if the instance is being restored.  Will set state to RESTORING
   * 
   * @returns {Promise}
   */
  async start(instNameOrId, orgNameOrId, opts={}) {
    if( !config.k8s.enabled ) {
      logger.warn('K8s is not enabled, just setting state to RUN');
      this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.RUN);
      return;
    }

    logger.info('Apply k8s config for instance', instNameOrId, orgNameOrId);

    let instance = await this.get(instNameOrId, orgNameOrId);
    let customProps = await client.getInstanceConfig(instNameOrId, orgNameOrId);
    let instanceImage = customProps.image || config.pgInstance.image;

    let hostname = instance.hostname;

    let templates = await modelUtils.getTemplate('postgres');

    // Postgres
    let k8sConfig = templates.find(t => t.kind === 'StatefulSet');
    k8sConfig.metadata.name = hostname;
    
    let spec = k8sConfig.spec;
    spec.selector.matchLabels.app = hostname;
    spec.serviceName = hostname;

    if( customProps.volumeSize ) {
      spec.volumeClaimTemplates[0].spec.resources.requests.storage = customProps.volumeSize;
    }

    let template = spec.template;
    template.metadata.labels.app = hostname;

    // main pg container
    let container = template.spec.containers[0];
    container.image = instanceImage;
    container.volumeMounts[0].name = hostname+'-ps';

    // helper container
    container = template.spec.containers[1];
    container.image = config.pgHelper.image;
    container.env.push({
      name : 'PG_INSTANCE_NAME',
      value : instance.name
    });
    container.env.push({
      name : 'PG_INSTANCE_ORGANIZATION',
      value : instance.organization_id
    });
    container.env.push({
      name : 'APP_URL',
      value : config.appUrl
    })

    spec.volumeClaimTemplates[0].metadata.name = hostname+'-ps';

    let pgResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });
    logger.info('Applied instance k8s config', hostname);

    // Postgres Service
    k8sConfig = templates.find(t => t.kind === 'Service');
    k8sConfig.metadata.name = hostname;
    k8sConfig.spec.selector.app = hostname;

    let pgServiceResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });
    logger.info('Applied instance k8s service config', hostname);

    if( opts.isRestoring ) {
      await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.RESTORING);
    } else {
      await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.RUN);
    }

    return {pgResult, pgServiceResult};
  }

  /**
   * @method stop
   * @description Stop a postgres instance and service in k8s (kubectl delete)
   * 
   * @param {String} instNameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * @param {Object} opts
   * @param {Boolean} opts.isArchived set to true if the instance has been archived.  will set state to ARCHIVE
   * 
   * @returns {Promise<Object>}
   */
  async stop(instNameOrId, orgNameOrId, opts={}) {
    if( !config.k8s.enabled ) {
      logger.warn('K8s is not enabled, just setting state to SLEEP');
      await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.SLEEP);
      return;
    }

    let instance = await this.get(instNameOrId, orgNameOrId);
    let hostname = instance.hostname;

    logger.info('Stopping instance', hostname);

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

    if( opts.isArchived ) {
      await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.ARCHIVE);
    } else {
      await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.SLEEP);
    }

    return  {pgResult, pgServiceResult};
  }

  /**
   * @method restart
   * @description Restart an instance.  This will run the kubectl
   * rollout restart command on the statefulset for the instance.
   * 
   * @param {String} instNameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * @returns 
   */
  async restart(instNameOrId, orgNameOrId=null) {
    let instance = await this.get(instNameOrId, orgNameOrId);
    let hostname = instance.hostname;

    let pgResult;

    try {
      pgResult = await kubectl.restart('statefulset', hostname);
    } catch(e) {
      logger.warn('Error deleting service', e.message);
      pgResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    return pgResult;
  }

  async remoteSyncUsers(instNameOrId, orgNameOrId=null) {
    let instance = await client.getInstance(instNameOrId, orgNameOrId);
    if( instance.state !== 'RUN' ) {
      throw new Error('Instance must be RUN state to sync users: '+instance.name);
    }

    logger.info(`Rpc request to resync users for instance ${instance.hostname}`);
    
    return remoteExec(instance.hostname, '/sync-users');
  }

  async resizeVolume(instNameOrId, orgNameOrId, size) {
    let customProps = await client.getInstanceConfig(instNameOrId, orgNameOrId);
    
    // convert size to Gi
    if( typeof size === 'number' ) {
      size = size+'Gi';
    } else {
      size = size.replace(/[^0-9]/g, '')+'Gi';
    }

    let intOrgSize = parseInt(customProps.volumeSize || 5);
    let intNewSize = parseInt(size);
    if( intNewSize < intOrgSize ) {
      throw new Error('New volume size must be greater than current size');
    }

    await client.setInstanceConfig(instNameOrId, orgNameOrId, 'volumeSize', size);

    let instance = await this.get(instNameOrId, orgNameOrId);
    let pvcName = instance.hostname+'-ps-'+instance.hostname+'-0';

    let currentConfig = await kubectl.get('pvc', pvcName);
    currentConfig.spec.resources.requests.storage = size;

    await kubectl.apply(currentConfig, {
      stdin: true,
      isJson: true
    });
  }

}

const instance = new Instance();
export default instance;