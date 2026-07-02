import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js'
import config from '../lib/config.js';
import kubectl from '../lib/kubectl.js';
import logger from '../lib/logger.js';
import modelUtils from './utils.js';
import remoteExec from '../lib/pg-helper-remote-exec.js';
import { getContext } from '../lib/context.js';
import { getInstanceState, getType } from '../lib/instance-resources.js';


class Instance {

  constructor() {
    this.STATES = config.pgInstance.states;
    this.AVAILABLE_STATES = config.pgInstance.availableStates;
  }

  /**
   * @method getConnection
   * @description Returns a postgres user connection object for the
   * postgres database for a given instance name and organization
   * 
   * 
   * @param {String|Object} ctx context object or id
   * @returns {Promise<Object>} connection object
   */
  async getConnection(ctx) {
    ctx = getContext(ctx);

    let pgUser = {};
    try {
      pgUser = await this.models.user.get(ctx, config.pgInstance.adminRole);
    } catch(e) {}

    let instance = ctx.instance;
    if( !instance ) {
      throw new Error('Instance not found in context');
    }
    if( !instance.hostname || !instance.port  ) {
      throw new Error('Instance hostname or port not found in context');
    }

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
   * @param {Object} opts query options
   * @param {String} opts.limit default 10
   * @param {String} opts.offset default 0
   * @param {String} opts.state filter by state
   * @param {String} opts.organization filter by organization
   * 
   * @returns {Promise<Array>}
   **/
  list(opts={}) {
    return client.getInstances(opts);
  }

  /**
   * @method get
   * @description get instance by name or id.  The name can
   * omit the 'inst-' prefix and it will be added automatically.
   * 
   * @param {String|Object} ctx context object or id
   * 
   * @returns {Promise<Object>}
   **/
  get(ctx) {
    ctx = getContext(ctx);
    return client.getInstance(ctx);
  }

  /**
   * @method exists
   * @description check if an instance exists.  Wraps the get method
   * and catches the error if the instance does not exist.
   * 
   * @param {String|Object} ctx context object or id
   * 
   * @returns {Promise<Boolean>}
   **/
  async exists(ctx) {
    try {
      return await this.get(ctx);
    } catch(e) {}
    return false;
  }

  /**
   * @method create
   * @description create a new instance
   * 
   * @param {Object} instance
   * @param {String} instance.name name of the instance
   * @param {String} instance.description description of the instance
   * @param {String} instance.hostname hostname of the instance
   * @param {String} instance.organization Optional. name or ID of the organization 
   * 
   * @returns {Promise<Object>}
   */
  async create(ctx, instance) {
    ctx = getContext(ctx);

    // make sure instance's always start with 'inst-'
    // this lets us know its an instance and not a database by name
    instance.name = 'inst-'+modelUtils.cleanInstDbName(instance.name);
    
    let shortName = instance.name.replace(/^inst-/, '');

    let exists = await this.exists(ctx);
    if( exists ) {
      throw new Error('Instance already exists: '+instance.name);
    }

    // look up organization name to use in hostname
    let orgName = instance.organization || ctx.organization || '';
    if( typeof orgName === 'object' ) {
      orgName = orgName.name;
    }

    if( orgName ) {
      instance.organization = orgName;
    }

    instance.hostname = ['inst', orgName, shortName].join('-');

    logger.info('Creating instance', ctx.logSignal, {instance, organization: orgName});
    await client.createInstance(instance);

    // set a context
    await ctx.update({
      instance : instance.name, 
      organization : instance.organization
    });

    return this.get(ctx);
  }

  /**
   * @method initInstanceDb
   * @description Initialize the database pgfarm public user and postgres user
   * 
   * @param {String|Object} ctx context object or id 
   */
  async initInstanceDb(ctx) {
    ctx = getContext(ctx);

    // create postgres user to admin database, resets password
    try {
      logger.info('Ensuring postgres user', ctx.logSignal)
      await this.models.user.create(ctx, 'postgres');
    } catch(e) {
      logger.warn(`Failed to create postgres user for on instance`, {e}, ctx.logSignal);
    }

    // add public user
    try {
      logger.info('Ensuring public user', 
        config.pgInstance.publicRole.username,
        ctx.logSignal
      )
      await this.models.user.create(ctx, config.pgInstance.publicRole.username);
    } catch(e) {
      logger.warn(`Failed to create public user`,  config.pgInstance.publicRole.username, {e}, ctx.logSignal);
    }
  }

  /**
   * @method update
   * @description update instance property, e.g. hostname, description
   * 
   * @param {String|Object} ctx context object or id
   * @param {String} property 
   * @param {String} value 
   * @returns 
   */
  async update(ctx, property, value) {
    ctx = getContext(ctx);
    logger.info('Updating instance property', `${property}="${value}"`, ctx.logSignal);
    return client.updateInstanceProperty(ctx, property, value);
  }

  /**
   * @method setInstanceState
   * @description set the state of the instance
   * 
   * @param {String|Object} ctx context object or id
   * @param {String} state 
   * @returns 
   */
  async setInstanceState(ctx, state) {
    ctx = getContext(ctx);
    logger.info('Setting instance state', state, ctx.logSignal);
    return client.updateInstanceProperty(ctx, 'state', state);
  }

  /**
   * @method checkInstanceState
   * @description check if the instance is in the given state
   * 
   * @param {String|Object} ctx context object or id
   * @param {String|Array} states instance state or array of states
   * 
   * @returns {Promise<Boolean>}
   */
  checkInstanceState(ctx, states) {
    let instance = ctx.instance;
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

  /**
   * @method setInstanceConfig
   * @description set the instance k8s config value
   * 
   * @param {String|Object} ctx context object or id
   * @param {String} name name of the config property
   * @param {String} value value of the config
   */
  async setInstanceConfig(ctx, name, value) {
    ctx = getContext(ctx);
    return client.setInstanceConfig(ctx, name, value);
  }

  /**
   * @method start
   * @description Starts a postgres instance and service in k8s
   * 
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {Boolean} opts.isRestoring set to true if the instance is being restored.  Will set state to RESTORING
   * 
   * @returns {Promise}
   */
  async start(ctx, opts={}) {
    ctx = getContext(ctx);

    logger.info('Starting instance', ctx.logSignal);

    if( !config.k8s.enabled ) {
      logger.warn('K8s is not enabled, just setting state to RUN');
      await this.setInstanceState(ctx, this.STATES.RUN);
      return;
    }

    let instance = ctx.instance;

    const type = getType(instance.availability);
    logger.info('Database startup called, setting active priority', {podPriority: String(type.priorityValue)}, ctx.logSignal);
    await client.updateInstancePriority(ctx, type.priorityValue);

    let applyResp = await this.apply(ctx);
    await kubectl.applyPdb(instance.hostname, 1);

    if( opts.isRestoring ) {
      await this.setInstanceState(ctx, this.STATES.RESTORING);
    } else {
      await this.setInstanceState(ctx, this.STATES.RUN);
    }

    return applyResp;
  }

  /**
   * @method updatePriority
   * @description Update the priority of the instance
   * 
   * @param {String|Object} ctx context object or id
   * @param {Number} priority new priority value
   * @param {Boolean} apply whether to apply the changes to k8s
   * 
   * @returns {Promise}
   */
  async updatePriority(ctx, priority, apply=false) {
    ctx = getContext(ctx);
    priority = Number(priority);
    if( isNaN(priority) || priority < 0 || priority > 10) {
      throw new Error('Invalid priority value: '+priority);
    }

    if( ctx.instance.priority_state === priority ) {
      logger.info('Instance priority is already set to '+priority, {podPriority: String(priority)}, ctx.logSignal);
      return {updated: false, priority};
    }

    logger.info(`Updating instance priority from ${ctx.instance.priority_state} to ${priority}`, {podPriority: String(priority)}, ctx.logSignal);
    await client.updateInstancePriority(ctx, priority);

    if( apply ) {
      await this.apply(ctx);
    }

    return {
      updated: true,
      oldPriority: ctx.instance.priority_state,
      newPriority: priority,
      applied: apply
    };
  }

  /**
   * @method apply
   * @description Apply the k8s config for the instance from the current
   * instance state.
   * 
   * @param {String|Object} ctx context object or id
   * @returns {Promise<Object>}
   */
  async apply(ctx) {
    ctx = getContext(ctx);
    logger.info('Applying instance k8s config', ctx.logSignal);

    let instance = ctx.instance;
    let customProps = await client.getInstanceConfig(ctx);
    let instanceImage = customProps.image || config.pgInstance.image;

    let hostname = instance.hostname;

    let templates = await modelUtils.getTemplate('postgres');
    const type = getType(instance.availability);

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

    template.spec.priorityClassName = type.priorityClass;

    // main pg container — limits are sticky (never change while pod is ON);
    // activeRequests are applied on start and restored by setActiveResources() on wake.
    let container = template.spec.containers[0];
    container.image = instanceImage;
    container.volumeMounts.find(i => i.mountPath == '/var/lib/postgresql/data').name = hostname+'-ps';
    container.resources = {
      limits   : type.limits,
      requests : type.activeRequests,
    };

    // helper container
    container = template.spec.containers[1];
    container.image = config.pgHelper.image;
    container.resources = {
      limits   : type.helperLimits,
      requests : type.helperActiveRequests,
    };
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

    modelUtils.cleanTemplateForLocalDev(k8sConfig);

    let pgResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });
    logger.info('Applied instance k8s config', hostname, ctx.logSignal);

    // Postgres Service
    k8sConfig = templates.find(t => t.kind === 'Service');
    k8sConfig.metadata.name = hostname;
    k8sConfig.spec.selector.app = hostname;

    modelUtils.cleanTemplateForLocalDev(k8sConfig);

    let pgServiceResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });
    logger.info('Applied instance k8s service config', hostname, ctx.logSignal);

    return {pgResult, pgServiceResult};
  }  

  /**
   * @method stop
   * @description Stop a postgres instance and service in k8s (kubectl delete)
   * 
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {Boolean} opts.isArchived set to true if the instance has been archived.  will set state to ARCHIVE
   * 
   * @returns {Promise<Object>}
   */
  async stop(ctx, opts={}) {
    if( !config.k8s.enabled ) {
      logger.warn('K8s is not enabled, just setting state to SLEEP');
      await this.setInstanceState(ctx, this.STATES.SLEEP);
      return;
    }

    let instance = ctx.instance;
    let hostname = instance.hostname;

    logger.info('Stopping instance', hostname, ctx.logSignal);
    await this.setInstanceState(ctx, this.STATES.STOPPING);

    await kubectl.deletePdb(hostname);

    let pgResult, pgServiceResult;

    try {
      pgResult = await kubectl.delete('statefulset', hostname);
    } catch(e) {
      logger.warn('Error deleting statefulset', {e}, ctx.logSignal);
      pgResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    try {
      pgServiceResult = await kubectl.delete('service', hostname);
    } catch(e) {
      logger.warn('Error deleting service', {e}, ctx.logSignal);
      pgServiceResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    if( opts.isArchived ) {
      await this.setInstanceState(ctx, this.STATES.ARCHIVE);
    } else {
      await this.setInstanceState(ctx, this.STATES.SLEEP);
    }

    return  {pgResult, pgServiceResult};
  }

  /**
   * @method setActiveResources
   * @description Switch a running pod to active resource requests and protect it from
   * voluntary eviction (PDB minAvailable=1). Called when a query arrives on an idle pod.
   * Does not restart postgres — only request values and PDB are changed in-place.
   *
   * @param {String|Object} ctx context object or id
   * @returns {Promise}
   */
  async setActiveResources(ctx) {
    ctx = getContext(ctx);
    const instance = ctx.instance;
    const type = getType(instance.availability);
    const podName = `${instance.hostname}-0`;

    logger.info('Waking instance to active resources', {podPriority: String(type.priorityValue)}, ctx.logSignal);

    await kubectl.patchPodResources(podName, [
      { name: 'postgres',  requests: type.activeRequests       },
      { name: 'pg-helper', requests: type.helperActiveRequests },
    ]);
    await kubectl.applyPdb(instance.hostname, 1);
    await client.updateInstancePriority(ctx, type.priorityValue);
  }

  /**
   * @method setIdleResources
   * @description Switch a running pod to floor resource requests and allow voluntary
   * eviction (PDB minAvailable=0). Called by the sleep cron when the instance has been
   * inactive for idleAfter ms. Does not restart postgres.
   *
   * @param {String|Object} ctx context object or id
   * @returns {Promise}
   */
  async setIdleResources(ctx) {
    ctx = getContext(ctx);
    const instance = ctx.instance;
    const type = getType(instance.availability);
    const podName = `${instance.hostname}-0`;

    logger.info('Setting instance to idle resources', {podPriority: '0'}, ctx.logSignal);

    await kubectl.patchPodResources(podName, [
      { name: 'postgres',  requests: type.idleRequests       },
      { name: 'pg-helper', requests: type.helperIdleRequests },
    ]);
    await kubectl.applyPdb(instance.hostname, 0);
    await client.updateInstancePriority(ctx, 0);
  }

  /**
   * @method restart
   * @description Restart an instance.  This will run the kubectl
   * rollout restart command on the statefulset for the instance.
   * 
   * @param {String|Object} ctx
   * @returns 
   */
  async restart(ctx) {
    let instance = ctx.instance;
    let hostname = instance.hostname;

    let pgResult;

    try {
      pgResult = await kubectl.restart('statefulset', hostname);
    } catch(e) {
      logger.warn('Error deleting service', {e}, ctx.logSignal);
      pgResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    return pgResult;
  }

  async remoteSyncUsers(ctx, updatePassword, hardReset=false) {
    logger.info('Remote sync users', logger.objToString({updatePassword, hardReset}),ctx.logSignal, );

    let instance = ctx.instance;
    if( instance.state !== 'RUN' ) {
      throw new Error('Instance must be RUN state to sync users: '+instance.name);
    }

    logger.info(`Rpc request to resync users for instance`, instance.hostname, ctx.logSignal);


    let users = await client.getInstanceUsers(instance.instance_id);
    let data = [];
    for( let user of users ) {
      if( !['ADMIN', 'PUBLIC', 'USER', 'PGREST'].includes(user.type) ) {
        logger.warn(`Skipping user ${user.username} of type ${user.type}`, ctx.logSignal);
        continue;
      }
      if( user.type === 'PGREST' && (updatePassword == false && hardReset == false) ) {
        logger.warn(`Skipping user ${user.username} of type ${user.type}, no hard reset`, ctx.logSignal);
        continue;
      }

      let password = updatePassword ? null : user.password;
      if( user.type === 'PUBLIC' ) {
        password = config.pgInstance.publicRole.password;
      }

      password = await this.models.user.resetPassword(
        ctx, 
        user.username, 
        password, 
        false
      );

      let resp = await remoteExec(instance.hostname, '/sync-user', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
          username : user.username,
          password
        })
      });

      let body = await resp.text();
      data.push({
        username : user.username,
        response : {
          status : resp.status,
          body
        }
      });

      if( resp.status > 299 ) {
        logger.error(`Error syncing user ${user.username} to instance ${instance.hostname}`, resp.status, body, ctx.logSignal);
        return data;
      }

      if( updatePassword && hardReset && user.type === 'PGREST' ) {
        let dbs = await client.getInstanceDatabases(ctx);
        for( let db of dbs ) {
          let dbCtx = ctx.clone();
          await dbCtx.update({database: db.name});

          await this.models.pgRest.restart(dbCtx);
        }
      }

      logger.info(`Synced user ${user.username} to instance ${instance.hostname}`, resp.status, ctx.logSignal);
    }

    return data;
  }

  /**
   * @method syncUser 
   * @description Sync a user to the instance.  This will create the user
   * in the instance's postgres database and grant the user access to the
   * instance's database. If the user already exists, the password will be
   * updated.  This should be run by the PG Helper container on the instance.
   * 
   * @param {String|Object} ctx context object or id
   * @param {Object} user 
   */
  async syncUser(ctx, user) {
    // this establishes a socket connection to the instance 'postgres' database
    let con = await this.models.database.getConnection(ctx, {database: 'postgres', useSocket: true});

    logger.info('Syncing user', user.username);
    await pgInstClient.createOrUpdatePgUser(con, user)

    // grant the users role to the authenticator user
    if( user.username !== config.pgInstance.adminRole && user.username !== config.pgRest.authenticator.username ) {
      await this.models.pgRest.grantUserAccess(ctx, user.username, con);
    }
  }

  /**
   * @method resizeVolume
   * @description Resize the volume for the instance.  This will update the k8s
   * config for the instance and then resize the volume in k8s.
   *
   * StatefulSet.spec.volumeClaimTemplates is immutable, so the PVC itself is patched
   * directly to trigger the actual disk resize.  The StatefulSet is then deleted with
   * --cascade=orphan (leaving the running pod and PVC untouched) and reapplied so its
   * spec reflects the new size.  Without this, the next call to apply() would fail
   * trying to update the immutable volumeClaimTemplates field on the live StatefulSet.
   *
   * @param {String|Object} ctx context object or id
   * @param {Number} size integer size in GiB or string size with GiB suffix
   */
  async resizeVolume(ctx, size) {
    ctx = getContext(ctx);
    let customProps = await client.getInstanceConfig(ctx);

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

    await client.setInstanceConfig(ctx, 'volumeSize', size);

    let instance = ctx.instance;
    let hostname = instance.hostname;
    let pvcName = hostname+'-ps-'+hostname+'-0';

    const patch = JSON.stringify({ spec: { resources: { requests: { storage: size } } } });
    await kubectl.exec(`kubectl patch pvc ${pvcName} --type merge -p '${patch}'`);

    logger.info('Recreating statefulset to pick up resized volume claim template', hostname, ctx.logSignal);
    await kubectl.delete('statefulset', hostname, {cascade: 'orphan'});
    await this.apply(ctx);
  }

  getPodStatus(ctx) {
    ctx = getContext(ctx);
    let podName = (ctx?.instance?.hostname)+'-0';
    return kubectl.getPodStatus(podName);
  }

}

const instance = new Instance();
export default instance;