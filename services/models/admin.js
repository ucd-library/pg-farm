import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js';
import utils from '../lib/utils.js';
import kubectl from '../lib/kubectl.js';
import config from '../lib/config.js';
import logger from '../lib/logger.js';
import modelUtils from './utils.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import pgFormat from 'pg-format';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let schemaPath = path.join(__dirname, '..', 'administration', 'schema');

class AdminModel {

  constructor() {
    this.instancesStarting = {};
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
   * @method createUser
   * @description Creates a new user in the database.  This will also grant
   * the role to the pgrest authenticator user.
   * 
   * @param {String} instNameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * @param {String} user username
   * @param {String} type instance_user_type USER, ADMIN, PGREST, SERVICE_ACCOUNT or PUBLIC
   * @param {Object} opts
   * @param {String} opts.parent parent username.  Required for SERVICE_ACCOUNT
   */
  async createUser(instNameOrId, orgNameOrId, user, type='USER', opts={}) {
    await this.models.user.create(instNameOrId, orgNameOrId, user, type, null, null, opts.parent);
    if( ['USER', 'ADMIN'].includes(type) ) {
      await this.models.pgRest.grantUserAccess(instNameOrId, orgNameOrId, user);
    }
  }

  async updateUser(instNameOrId, orgNameOrId, user, type='USER') {
    let userObj = await this.models.user.get(instNameOrId, orgNameOrId, user);
    if( userObj.user_type !== 'USER' && userObj.user_type !== 'ADMIN' ) {
      throw new Error('Cannot update user type: '+userObj.user_type);
    }

    await this.models.user.updateType(instNameOrId, orgNameOrId, user, type);
  }

  async deleteUser(instNameOrId, orgNameOrId, user) {
    await this.models.user.delete(instNameOrId, orgNameOrId, user);
  }

  /**
   * @method ensureDatabase
   * @description Creates a new database.  This will also create the instance and
   * organization if they do not exist and are provided in the options.  This will
   * attempt to start the instance if it is not already running.  Additionally this command
   * will always run even if the database already exists.  Ensuring all users, roles, and
   * schema are up to date.
   * 
   * @param {Object} opts
   * @param {String} opts.name name of database
   * @param {String} opts.database alias for name
   * @param {String} opts.organization name or id of organization
   * @param {String} opts.instance name or id of instance 
   */
  async ensureDatabase(opts={}) {
    let name = modelUtils.cleanInstDbName(opts.name || opts.database);
    let organization;

    if( opts.organization ) {
      organization = await this.models.organization.exists(opts.organization);
      if( !organization ) {
        organization = await this.models.organization.create(opts.organization);
        // make sure we are using the actual name of the org after cleanup
        opts.organization = organization.name;
      }
    }

    // create instance if not provided
    if( !opts.instance ) {
      opts.instance = name;
    }

    let instance = await this.models.instance.exists(opts.instance, opts.organization);
    if( !instance ) {
      let iOpts = {};
      if( opts.organization ) iOpts.organization = opts.organization;
      instance = await this.models.instance.create(opts.instance, iOpts);
    }

    await this.startInstance(instance.name, opts.organization);

    // ensure the public user and pg user password update
    await this.models.instance.initInstanceDb(instance.name, opts.organization);

    opts.instance = instance.name;

    let database = await this.models.database.exists(name, opts.organization);
    if( !database ) {
      await this.models.database.create(name, opts);
      database = await this.models.database.get(name, opts.organization); 
    } else {
      await this.models.database.ensurePgDatabase(instance.name, opts.organization, database.database_name);
    }

    // initialize the database for PostgREST roles and schem
    await this.models.pgRest.initDb(database.database_name, instance.name, opts.organization);

    // start pg rest once instance is running
    await this.models.pgRest.start(database.database_name, opts.organization);
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
    await this.models.instance.create(name, opts);
  }


  /**
   * @method stopInstance
   * @description Stops a running instance.  This will also stop all pgRest
   * services associated with the instance.
   * 
   * @param {String} instNameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * @param {Object} opts
   * @param {Boolean} opts.isArchived set to true if the instance has been archived.  will set state to ARCHIVE
   * 
   * @returns {Promise}
   */
  async stopInstance(instNameOrId, orgNameOrId, opts={}) {
    await this.models.instance.stop(instNameOrId, orgNameOrId, opts);
    let dbs = await client.getInstanceDatabases(instNameOrId, orgNameOrId);
    for( let db of dbs ) {
      await this.models.pgRest.stop(db.database_id, orgNameOrId);
    }
  }

  /**
   * @method restoreInstance
   * @description Restores a database instance from a backup.  This will 
   * start the instance in restoring state and then run the restore on the
   * pg-helper container.
   * 
   * @param {String} instNameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * 
   * @returns {Promise}
   **/
  async restoreInstance(instNameOrId, orgNameOrId) {
    // start the instance in restoring state
    await this.models.instance.start(instNameOrId, orgNameOrId, {
      isRestoring: true
    });

    // wait for the instance to accept connections
    let instance = await this.models.instance.get(instNameOrId, orgNameOrId);
    await utils.waitUntil(instance.hostname, instance.port);

    // run the restore on the pg-helper container
    return this.models.backup.remoteRestore(instNameOrId, orgNameOrId);
  }

  /**
   * @method archiveInstance
   * @description Archives an instance.  This will call the archive function
   * on the pg-helper container.  The pg-helper container will set the 
   * instance state to ARCHIVING, stop all pgRest services, and then run the
   * pg_dump for each database, check that all backups have synced to GCS, and
   * then set the instance state to ARCHIVE.
   * 
   * @param {String} instNameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * 
   * @returns {Promise}
   **/
  async archiveInstance(instNameOrId, orgNameOrId) {
    await this.models.instance.remoteArchive(instNameOrId, orgNameOrId);
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
  async syncInstanceUsers(instNameOrId, orgNameOrId, updatePassword=false) {
    logger.info('Syncing instance users', instNameOrId, orgNameOrId);

    let instance = await this.models.instance.get(instNameOrId, orgNameOrId);
    let users = await client.getInstanceUsers(instance.instance_id);
    let con = await this.models.database.getConnection('postgres', orgNameOrId, {useSocket: true});

    for( let user of users ) {
      if( !['ADMIN', 'PUBLIC', 'USER'].includes(user.type) ) {
        continue;
      }

      // get db user
      let result = await pgInstClient.query(
        con,
        `SELECT * FROM pg_catalog.pg_user WHERE usename=$1`,
        [user.username]
      );
      let exists = (result.rows.length > 0);

      if( exists ) {
        logger.info('User exists', user.username, 'updating password');
        if( updatePassword ) {
          await this.resetPassword(instNameOrId, user.username);
        } else {
          let formattedQuery = pgFormat('ALTER USER "%s" WITH PASSWORD %L', user.username, user.password);
          await pgInstClient.query(con, formattedQuery);
        }
      } else {
        logger.info('User does not exist', user.username, 'creating user');
        let formattedQuery = pgFormat('CREATE ROLE "%s" WITH LOGIN PASSWORD %L', user.username, user.password);
        await pgInstClient.query(con, formattedQuery);
      }

      // grant the users role to the authenticator user4
      if( user.username !== config.pgInstance.adminRole ) {
        await this.models.pgRest.grantUserAccess(instNameOrId, orgNameOrId, user.username, con);
      }
    }
  }

  /**
   * @method getDatabases
   * @description Returns a list of instances.  If username is provided, only
   * instances that the user has access to will be returned.
   * 
   * @param {Object} opts
   * @param {String} opts.username 
   * @returns 
   */
  async getDatabases(opts={}) {
    let appHostname = new URL(config.appUrl).hostname;
    let databases = await client.getDatabases(opts);
    
    let resp = [];
    for( let db of databases ) {
      let dbOrgName = (db.organization_name ? db.organization_name+'/' : '')+db.database_name;
      let dbUrlName = (db.organization_name ? db.organization_name : '_')+'/'+db.database_name;

      let organization = null;
      if( db.organization_name ) {
        organization = {
          name : db.organization_name,
          title : db.organization_title
        }
      }

      resp.push({
        title : db.database_title,
        database : dbOrgName,
        organization,
        host : appHostname,
        port : 5432,
        api : config.appUrl+'/api/db/'+dbUrlName,
        publicAccess : {
          username : db.username,
          password : db.password,
          connectionUri : `postgres://${db.username}:${db.password}@${appHostname}:5432/${dbOrgName}`,
          psql : `PGPASSWORD="${db.password}" psql -h ${appHostname} -U ${db.username} ${dbOrgName}`
        },
        id : db.database_id,
        instance : db.instance_name
      })
    }

    return resp;
  }

  /**
   * @method sleepInstances
   * @description Sleep instances that have been idle for too long.  Query
   * all running instances.  Then check the last database event for each
   * instance.  If the instance has been idle for longer than the availibility
   * time, shut it down.
   */
  async sleepInstances() {
    let active = await client.getInstances(this.models.instance.STATES.RUN);
    let availableStates = this.models.instance.AVAILABLE_STATES;
    let now = Date.now();
    
    for( let instance of active ) {
      if( instance.availability === 'ALWAYS' ) {
        continue;
      }

      let e = await client.getLastDatabaseEvent(instance.instance_id);
      if( !e ) {
        logger.warn('No database events found for instance, shutting down', instance.instance_id);
        await this.stopInstance(instance.instance_id, instance.organization_id);
        continue;
      }

      let lastEvent = new Date(e.timestamp).getTime();
      let diff = now - lastEvent;
      let allowedTime = availableStates[instance.availability] || availableStates.LOW;

      if( diff > allowedTime ) {
        logger.info('Instance has been idle for too long, shutting down',{
          instance,
          lastEvent: e,
          availability: instance.availability,
          now, diff, allowedTime
        });
        await this.stopInstance(instance.instance_id, instance.organization_id);
      }
    }
  }

  /**
   * @method startInstance
   * @description Starts an instance.  This will start the pg instance and pgRest.  This
   * function will wait for the instance to be ready before returning.  If the instance
   * is already starting from a prior call, this function will wait for the current request to finish.
   * A health check is performed before starting the instance.  If the instance is already
   * running, this function will return false unless opts.force is set to true.  Instances
   * are 'started' by applying the k8s deployment and service yaml files, then polling the
   * TCP port until it is ready and accepting connections.
   * 
   * @param {String} nameOrId Either the name or id of the instance or database.  If database, set opts.isDb=true
   * @param {String} orgNameOrId organization name or id
   * @param {Object} opts
   * @param {Boolean} opts.isDb nameOrId parameter is a database name or id
   * @param {Boolean} opts.force force start the instance even if health check passes
   * @param {Boolean} opts.startPgRest start pgRest services as well as the pg instance
   * @param {Boolean} opts.waitForPgRest wait for pgRest services to be ready before resolving the promise
   *  
   * @returns {Promise<Boolean>} true if the instance was started, false if the instance was already running
   */
  async startInstance(nameOrId, orgNameOrId, opts={}) {
    let instance;

    let timestamp = Date.now();
    
    // get instance by database name or instance name depending on opts
    if( opts.isDb ) {
      instance = await this.models.instance.getByDatabase(nameOrId, orgNameOrId);
      nameOrId = instance.name;
    } else {
      instance = await this.models.instance.get(nameOrId, orgNameOrId);
    }
    let iid = instance.instance_id || instance.id;

    // check if instance is already starting
    if( this.instancesStarting[iid] ) {
      logger.info('Instance already starting', instance.hostname);
      return this.instancesStarting[iid].promise;
    }

    logger.info('Checking instance health', instance.hostname);

    // set instance starting promise
    this.instancesStarting[iid] = {};
    this.instancesStarting[iid].promise = new Promise((resolve, reject) => {
      this.instancesStarting[iid].resolve = resolve;
      this.instancesStarting[iid].reject = reject;
    });

    // check instance health
    let health = await utils.getHealth(
      instance.name,
      instance.organization_name
    );

    // TODO: split out pgRest and instance test.
    if (health.state === 'RUN' && health.tcpStatus.instance?.isAlive && !opts.force) {
      logger.info('Instance running', instance.hostname);
      this.resolveStart(instance);
      return false;
    }

    // log why we are starting the instance
    if( opts.force ) {
      logger.info('Force starting instance', instance.hostname);
    } else {
      logger.info('Health test failed, starting instance', {
        hostname: instance.hostname,
        health
      });
    }
    
    try {
      let proms = [];
      let dbs;

      // instances can have multiple databases associated with them.  Start all pgRest services
      // as pgRest services are started per database.
      if( opts.startPgRest ) {
        dbs = await client.getInstanceDatabases(nameOrId, orgNameOrId);
        proms = dbs.map(db => {
          return this.models.pgRest.start(db.database_id, db.organization_id);
        })
      }

      proms.push(this.models.instance.start(instance.instance_id, instance.organization_id));

      // wait for instance to be ready
      await utils.waitUntil(instance.hostname, instance.port);

      logger.info('Instance is ready', instance.hostname);

      // if there are pgRest services, wait for them to be ready if flag is set
      if( opts.startPgRest && opts.waitForPgRest && dbs.length ) {
        // wait for all instances to be deploy
        await Promise.all(proms);

        // wait for instances to come alive        
        proms = dbs.map(async db => {
          await utils.waitUntil(db.pgrest_hostname, config.pgRest.port);
          await waitForPgRestDb(db.pgrest_hostname, config.pgRest.port);
        });
        await Promise.all(proms);
      }

      // hack for docker-desktop to wait for the instance DNS to be ready
      // there seems to be issues with it going up and down when instance first starts
      if( config.k8s.platform === 'docker-desktop' ) {
        logger.info('Waiting for DNS to be ready in docker-desktop');
        await utils.sleep(5000);
      }

    } catch(e) {
      logger.error('Error starting instance', e);
      this.rejectStart(instance, e);
      return;
    }

    logger.info(`Instance health ${instance.hostname} started.  time=`, ((Date.now()-timestamp)/1000).toFixed(1), 's');

    this.resolveStart(instance);

    return true;
  }

  rejectStart(instance, e) {
    let id = instance.instance_id || instance.id;
    if( !this.instancesStarting[id] ) return;
  
    this.instancesStarting[id].reject(e);
    delete this.instancesStarting[id];
  }
  
  resolveStart(instance) {
    let id = instance.instance_id || instance.id;
    if( !this.instancesStarting[id] ) return;
  
    this.instancesStarting[id].resolve(instance);
    delete this.instancesStarting[id];
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
    let resp = await fetch(`http://${host}:${port}`);
    isAlive = (resp.status !== 503);
    
    if( !isAlive ) {
      attempts++;
      await utils.sleep(delayTime);
    }
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