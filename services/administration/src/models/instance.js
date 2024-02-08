import client from '../../../lib/pg-admin-client.js';
import config from '../../../lib/config.js';
import kubectl from '../../../lib/kubectl.js';

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

    name = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    
    if( !opts.hostname ) {
      opts.hostname = 'pg-'+orgName+name;
    }

    return client.createInstance(name, opts);
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

    return client.updateInstance(nameOrId, organizationId, property, value);
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
    return client.updateInstance(nameOrId, orgNameOrId, 'state', state);
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

    spec.volumeClaimTemplates[0].metadata.name = hostname+'-ps';

    let pgResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });

    // Postgres Service
    k8sConfig = modelUtils.getTemplate('postgres-service');
    k8sConfig.metadata.name = hostname;
    k8sConfig.spec.selector.app = hostname;

    let pgServiceResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });

    this.setInstanceState(instNameOrId, this.STATES.RUN);

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

    let pgResult = await kubectl.delete('statefulset', hostname);
    let pgServiceResult = await kubectl.delete('service', hostname);

    await this.setInstanceState(instNameOrId, orgNameOrId, this.STATES.SLEEP);

    return  {pgResult, pgServiceResult};
  }




}

const instance = new Instance();
export default instance;