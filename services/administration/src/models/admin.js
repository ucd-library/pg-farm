import client from '../../../lib/pg-admin-client.js';
import pgInstClient from '../../../lib/pg-client.js';
import utils from '../../../lib/utils.js';
import kubectl from '../../../lib/kubectl.js';
import config from '../../../lib/config.js';
import logger from '../../../lib/logger.js';
import modelUtils from './utils.js';
import pgRest from './pg-rest.js'; 
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import pgFormat from 'pg-format';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let schemaPath = path.join(__dirname, '..', '..', 'schema');

class AdminModel {

  constructor() {
    this.instancesStarting = {};

    this.initSchema();
  }

  async initSchema() {
    await utils.waitUntil(config.adminDb.host, config.adminDb.port);
  
    // TODO: add migrations
    logger.info('loading sql files from: '+schemaPath)
  
    let files = sortInitScripts(fs.readdirSync(schemaPath));
    for( let file of files ) {
      if( path.parse(file).ext.toLowerCase() !== '.sql' ) continue;
      file = path.join(schemaPath, file);
      logger.info('loading: '+file);
      let response = await client.query(fs.readFileSync(file, 'utf-8'));
      logger.debug(response);
    }
  }

  /**
   * @method createInstance
   * @description Creates a new postgres instance
   * 
   * @param {String} name
   * @param {Object} opts
   * 
   * @returns {Promise}
   **/
  async createInstance(name, opts={}) {
    if( !name ) throw new Error('Instance name required');

    let hostname = opts.hostname || 'pg-'+name;
    let description = opts.description || '';
    let port = opts.port || 5432;
    let imageName = opts.imageName || config.pgInstance.image;

    // add instance to database
    let id = await client.createInstance(name, hostname, description, port);

    // add config
    await client.setInstanceConfig(id, 'image', imageName);

    // create k8s statefulset and service
    // using ensure instance here in case the instance is already running
    // possibly manually created or running docker compose environment
    await this.ensureInstanceRunning(name);

    // wait for instance to be ready
    await utils.waitUntil(hostname, port);

    // create instance database
    // TODO: how do we add params???
    try {
      let formattedQuery = pgFormat('CREATE DATABASE %s', name);
      let resp = await pgInstClient.query(
        {
          host : hostname,
          port : port,
          database : 'postgres',
          user  : 'postgres',
          password : 'postgres'
        }, 
        formattedQuery
      );
    } catch(e) {
      logger.error(e);
    }

    // create postgres user to database
    await this.createUser(id, 'postgres');

    await this.setupPgRest(name);

    return id;
  }

  /**
   * @method setupPgRest
   * @description Sets up the pg rest instance with roles and schema
   * https://postgrest.org/en/stable/tutorials/tut0.html#step-4-create-database-for-api
   * 
   */
  async setupPgRest(instNameOrId) {
    // add public user
    try {
      await this.createUser(instNameOrId, config.pgInstance.publicRole.username);
    } catch(e) {
      logger.warn(`Failed to create public user ${config.pgInstance.publicRole.username}: ${instNameOrId}`, e);
    }

    // add authenticator user
    try {
      await this.createUser(instNameOrId, config.pgRest.authenticator.username);
    } catch(e) {
      logger.warn(`Failed to create authenticator user ${config.pgRest.authenticator.username}: ${instNameOrId}`, e);
    }

    // initialize the database for PostgREST roles and schema
    await pgRest.initDb(instNameOrId);

    // start pg rest once instance is running
    await pgRest.start(instNameOrId);
  }

  /**
   * @method addUser
   * @description Adds a user to a postgres instance
   * 
   * @param {String} instNameOrId  PG Farm instance name or ID 
   * @param {String} user username 
   * @param {String} type USER, ADMIN, or PUBLIC.  Defaults to USER. 
   * @param {String} password optional.  defined password.  If not 
   * provided, a random password will be generated.
   * 
   * @returns {Promise}
   */
  async createUser(instNameOrId, user, type='USER', password, noinherit=false) {

    // check for reserved users
    if( user === config.pgInstance.publicRole.username ) {
      type = 'PUBLIC';
      password = config.pgInstance.publicRole.password;
    } else if( user === config.pgRest.authenticator.username ) {
      type = 'PGREST';
      noinherit = true;
    } else if( user === config.pgInstance.adminRole ) {
      type = 'ADMIN';
      password = 'postgres';
    }

    // create new random password
    if( !password ) {
      password = utils.generatePassword();
    }

    // add user to database
    await client.createUser(instNameOrId, user, password, type);

    // postgres user already exists.  Update password
    if( user === config.pgInstance.adminRole ) {
      await this.resetPassword(instNameOrId, config.pgInstance.adminRole);
      return;
    }

    // make sure pg is running
    await this.ensureInstanceRunning(instNameOrId);

    // get instance connection information
    let con = await client.getConnection(instNameOrId);

    // add user to postgres
    if( noinherit ) noinherit = 'NOINHERIT';
    else noinherit = '';

    let formattedQuery = pgFormat('CREATE ROLE "%s" LOGIN '+noinherit+' PASSWORD %L', user, password);
    let resp = await pgInstClient.query(
      con, 
      formattedQuery,
    );

    return resp;
  }

  getInstance(instNameOrId) {
    return client.getInstance(instNameOrId);
  }

  /**
   * @method startInstance
   * @description Starts a postgres instance and service in k8s
   * 
   * @param {String} instNameOrId PG Farm instance name or ID 
   * 
   * @returns {Promise}
   */
  async startInstance(instNameOrId) {
    let instance = await client.getInstance(instNameOrId);
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

    return {pgResult, pgServiceResult};
  }

  async stopInstance(instNameOrId) {
    let instance = await client.getInstance(instNameOrId);
    let hostname = instance.hostname;

    let pgResult = await kubectl.delete('statefulset', hostname);
    let pgServiceResult = await kubectl.delete('service', hostname);

    let result = await pgRest.remove(instNameOrId);

    return Object.assign(result, {pgResult, pgServiceResult});
  }

  /**
   * @method removeInstance
   * @description Removes a postgres instance and service.  
   * Note, this does not remove the persistent volume claim.
   * 
   * @param {*} name 
   */
  async removeInstance(name) {
    if( !name.startsWith('pg-') ) name = 'pg-'+name;

    let pgResult = await kubectl.delete('statefulset', name);
    let pgServiceResult = await kubectl.delete('service', name+'-service');

    return {pgResult, pgServiceResult};
  }

  /**
   * @method resetUserPassword
   * @description Resets a user's password to a random password
   * 
   * @param {String} instNameOrId PG Farm instance name or ID
   * @param {String} user 
   * @param {String} password 
   * 
   * @returns {Promise}
   */
  async resetPassword(instNameOrId, user, password) {
    let con = await client.getConnection(instNameOrId);

    // generate random password if not provided
    if( !password ) password = utils.generatePassword();

    // update database
    await client.query(
      `UPDATE ${config.adminDb.tables.DATABASE_USERS} 
      SET password = $2 
      WHERE username = $1 AND instance_id = $3`, 
      [user, password, con.id]
    );

    // make sure pg is running
    await this.ensureInstanceRunning(instNameOrId);

    // update postgres instance users password
    let formattedQuery = pgFormat('ALTER USER %s WITH PASSWORD %L', user, password);
    let resp = await pgInstClient.query(
      con, 
      formattedQuery
    );

    return resp;
  }

  /**
   * @method ensureInstanceRunning
   * @description Ensures an instance is running.  If the instance is not running,
   * it will be started.  If the instance is starting, the promise will wait until
   * the instance is running.
   * 
   * @param {String} instNameOrId
   *  
   * @returns {Promise}
   */
  async ensureInstanceRunning(instNameOrId) {
    // get instance information
    let instance = await client.getInstance(instNameOrId);
    let hostname = instance.hostname;
    let port = instance.port;

    // check if already alive
    let isAlive = await utils.isAlive(instance.hostname, instance.port);
    if( isAlive ) return;

    // check if already starting
    if( this.instancesStarting[hostname] ) {
      await utils.waitUntil(hostname, port);
      return;
    }

    // create a promise for other possible callers to wait on
    let state = {};
    state.promise = new Promise((resolve, reject) => {
      state.resolve = resolve;
      state.reject = reject;
    });

    this.instancesStarting[instance.hostname] = state;

    // start instance
    await this.startInstance(instNameOrId);
    
    // wait for instance to be ready
    await utils.waitUntil(hostname, port, 50);

    // resolve promise
    this.instancesStarting[instance.hostname].resolve();
    delete this.instancesStarting[instance.hostname];
  }

  /**
   * @method syncInstanceUsers
   * @description Syncs the database users with the postgres instance users.
   * Ensures that the database users are created in postgres and that the
   * pg farm password is set to the database user password.  This function
   * can be used to rotate all passwords.
   * 
   * @param {String} instNameOrId 
   * @param {Boolean} updatePassword update all user passwords
   * 
   * @returns {Promise}
   */
  async syncInstanceUsers(instNameOrId, updatePassword=false) {
    let users = await client.getInstanceUsers(instNameOrId);
    let con = await client.getConnection(instNameOrId);

    for( let user of users ) {

      // get db user
      let result = await pgInstClient.query(
        con,
        `SELECT * FROM pg_catalog.pg_user WHERE usename=$1`,
        [user.username]
      );
      let exists = (result.rows.length > 0);

      if( exists ) {
        if( updatePassword ) {
          await this.resetPassword(instNameOrId, user.username);
        } else {
          let formattedQuery = pgFormat('ALTER USER %s WITH PASSWORD %L', user.username, user.password);
          await pgInstClient.query(con, formattedQuery);
        }
      } else {
        let formattedQuery = pgFormat('CREATE USER %s WITH PASSWORD %L', user.username, user.password);
        await pgInstClient.query(con, formattedQuery);
      }
    }
  }

  /**
   * @method getInstances
   * @description Returns a list of instances.  If username is provided, only
   * instances that the user has access to will be returned.
   * 
   * @param {Object} opts
   * @param {String} opts.username 
   * @returns 
   */
  async getInstances(opts={}) {
    let appHostname = new URL(config.appUrl).hostname;
    let instances = await client.getInstances(opts);
    for( let instance of instances ) {
      try {
        let pubUser = await client.getUser(instance.id, config.pgInstance.publicRole.username);
        instance.publicAccess = {
          username : pubUser.username,
          password : pubUser.password,
          connectionUri : `postgres://${pubUser.username}:${pubUser.password}@${appHostname}:5432/${instance.name}`,
          psql : `PGPASSWORD="${pubUser.password}" psql -h ${appHostname} -U ${pubUser.username} -d ${instance.name}`
        }
      } catch(e) {
        logger.error('Failed to find public user for: '+instance.name, e);
      }
      
      instance.database = instance.name;
      instance.port = 5432;
      instance.host = appHostname;

      delete instance.name;

      instance.api = config.appUrl+'/api/db/'+instance.database;
      instance.psql = `psql -h `+appHostname+` -U `+config.pgInstance.publicRole.username+` -d `+instance.database;
    }

    return instances;
  }

}

function sortInitScripts(files) {
  files = files.map(file => {
    let index = 0;
    let name = file;
    if( file.match('-') ) {
      index = parseInt(file.split('-')[0]);
      name = file.split('-')[1];
    } 
    return {file, index, name};
  });

  files.sort((a,b) => {
    if( a.index < b.index ) return -1;
    if( a.index > b.index ) return 1;
    if( a.name < b.name ) return -1;
    if( a.name > b.name ) return 1;
    return 0;
  });

  return files.map(item => item.file);
}


const instance = new AdminModel();
export default instance;