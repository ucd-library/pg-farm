import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js';
import utils from '../lib/utils.js';
import kubectl from '../lib/kubectl.js';
import config from '../lib/config.js';
import logger from '../lib/logger.js';
import { getContext, createContext } from '../lib/context.js';
import modelUtils from './utils.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import pgFormat from 'pg-format';
import { getInstanceResources  } from '../lib/instance-resources.js';

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
   * @param {String|Object} ctx context object or id 
   * @param {Object} user 
   * @param {Object} user.username username
   * @param {Object} user.type instance_user_type USER, ADMIN, PGREST, SERVICE_ACCOUNT or PUBLIC
   * @param {Object} user.parent parent username.  Required for SERVICE_ACCOUNT
   */
  async createUser(ctx, user) {
    ctx = getContext(ctx);
    if( !user.type ) user.type = 'USER'

    await this.models.user.create(ctx, user);
    if( ['USER', 'ADMIN'].includes(user.type) ) {
      await this.models.pgRest.grantUserAccess(ctx, user);
    }
  }

  /**
   * @method updateUser
   * @description Updates a user type in the database. 
   * 
   * @param {String|Object} ctx 
   * @param {String} user username
   * @param {String} type pgfarm user type
   */
  async updateUser(ctx, user, type='USER') {
    let userObj = await this.models.user.get(ctx, user);
    if( userObj.user_type !== 'USER' && userObj.user_type !== 'ADMIN' ) {
      throw new Error('Cannot update user type: '+userObj.user_type);
    }

    await this.models.user.updateType(ctx, user, type);
  }

  /**
   * @method deleteUser
   * @description Deletes a user from the database. 
   * 
   * TODO: this should also revoke all user access
   * 
   * @param {String|Object} ctx string or context object
   * @param {String} user username
   */
  async deleteUser(ctx, user) {
    await this.models.user.delete(ctx, user);
  }

  /**
   * @method ensureDatabase
   * @description Creates a new database.  This will also create the instance and
   * organization if they do not exist and are provided in the options.  This will
   * attempt to start the instance if it is not already running.  Additionally this command
   * will always run even if the database already exists.  Ensuring all users, roles, and
   * schema are up to date.
   *
   * @param {Object|String} ctx context trace id or context object
   */
  async ensureDatabase(ctx) {
    ctx = getContext(ctx);

    logger.info('Ensuring database', ctx.logSignal);

    let name = modelUtils.cleanInstDbName(ctx.database.name);
    let organization;

    if( ctx.organization ) {
      organization = await this.models.organization.exists(ctx);
      if( !organization ) {
        organization = await this.models.organization.create(ctx, ctx.organization);
      } else {
        logger.info('Organization already exists', ctx.logSignal);
      }
    }
    ctx.organization = organization;

    // create instance if not provided
    if( !ctx?.instance?.name ) {
      if( !ctx.instance ) ctx.instance = {};
      ctx.instance.name = name;
    }

    let instance = await this.models.instance.exists(ctx);
    if( !instance ) {
      instance = await this.models.instance.create(ctx, ctx.instance);
    } else {
      logger.info('Instance already exists', ctx.logSignal);
    }
    ctx.instance = instance;

    let startResp = await this.startInstance(ctx);
    if( startResp.starting ) {
      await startResp.instance;
      await startResp.pgrest;
    }

    // ensure the public user and pg user password update
    await this.models.instance.initInstanceDb(ctx);

    let database = await this.models.database.exists(ctx);
    if( !database ) {
      database = await this.models.database.create(ctx, ctx.database);
    } else {
      logger.info('Database already exists', ctx.logSignal);
      await this.models.database.ensurePgDatabase(ctx);
    }
    ctx.database = database;

    // initialize the database for PostgREST roles and schem
    await this.models.pgRest.initDb(ctx);

    // start pg rest once instance is running
    await this.models.pgRest.start(ctx);

    return {
      database : ctx.database,
      instance : ctx.instance,
      organization : ctx.organization
    }
  }

  /**
   * @method stopInstance
   * @description Stops a running instance.  This will also stop all pgRest
   * services associated with the instance.
   *
   * @param {String} ctx
   * @param {Object} opts
   * @param {Boolean} opts.isArchived set to true if the instance has been archived.  will set state to ARCHIVE
   *
   * @returns {Promise}
   */
  async stopInstance(ctx, opts={}) {
    await this.models.instance.stop(ctx, opts);
    let dbs = await client.getInstanceDatabases(ctx);
    for( let db of dbs ) {
      await this.models.pgRest.stop({
        database : {name: db.name}, 
        organization : ctx.organization
      });
    }
  }

  /**
   * @method restoreInstance
   * @description Restores a database instance from a backup.  This will
   * start the instance in restoring state and then run the restore on the
   * pg-helper container.
   *
   * @param {String|Object} ctx context object or string
   *
   * @returns {Promise}
   **/
  async restoreInstance(ctx) {
    // start the instance in restoring state
    await this.models.instance.start(ctx, {
      isRestoring: true
    });

    // wait for the instance to accept connections
    let instance = ctx.instance;
    await utils.waitUntil(instance.hostname, instance.port);

    // run the restore on the pg-helper container
    return this.models.backup.remoteRestore(ctx);
  }

  /**
   * @method archiveInstance
   * @description Archives an instance.  This will call the archive function
   * on the pg-helper container.  The pg-helper container will set the
   * instance state to ARCHIVING, stop all pgRest services, and then run the
   * pg_dump for each database, check that all backups have synced to GCS, and
   * then set the instance state to ARCHIVE.
   *
   * @param {String|Object} ctx
   *
   * @returns {Promise}
   **/
  async archiveInstance(ctx) {
    await this.models.instance.remoteArchive(ctx);
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
  async syncInstanceUsers(ctx, updatePassword=false) {
    ctx = getContext(ctx);
    logger.info('Syncing instance users', ctx.logSignal);

    let instance = ctx.instance;
    let users = await client.getInstanceUsers(instance.instance_id);
    let con = await this.models.database.getConnection(ctx, {useSocket: true});

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
        logger.info('User exists', user.username, 'updating password', ctx.logSignal);
        if( updatePassword ) {
          await this.resetPassword(instNameOrId, user.username);
        } else {
          let formattedQuery = pgFormat('ALTER USER "%s" WITH PASSWORD %L', user.username, user.password);
          await pgInstClient.query(con, formattedQuery);
        }
      } else {
        logger.info('User does not exist', user.username, 'creating user', ctx.logSignal);
        let formattedQuery = pgFormat('CREATE ROLE "%s" WITH LOGIN PASSWORD %L', user.username, user.password);
        await pgInstClient.query(con, formattedQuery);
      }

      // grant the users role to the authenticator user4
      if( user.username !== config.pgInstance.adminRole ) {
        await this.models.pgRest.grantUserAccess(ctx, user.username, con);
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
        api : config.appUrl+'/api/query/'+dbUrlName,
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
  async sleepInstances(ctx) {
    ctx = getContext(ctx);

    logger.info('Sleeping instances', ctx.logSignal);

    let active = await client.getInstances({state: this.models.instance.STATES.RUN});
    
    let changed = [];

    for( let instance of active ) {
      if( instance.availability === 'ALWAYS' ) {
        continue;
      }

      let iCtx = ctx.clone();
      iCtx.instance = instance;

      let resources = await getInstanceResources(iCtx);

      if( resources.sleep ) {
        logger.info('Instance has been idle for too long, shutting down', iCtx.logSignal);
        changed.push({instance, newState: 'SLEEP'});
        await this.stopInstance(iCtx);
        continue;
      }

      let newPriority = parseInt(resources.name.split('-')[1]);
      if( newPriority !== instance.priority_state ) {
        logger.info(`Instance priority has changed from ${instance.priority_state} to ${newPriority}, updating instance`, iCtx.logSignal);
        await client.updateInstancePriority(iCtx, newPriority);
        await this.models.instance.apply(iCtx);
        
        let query = await client.getLastDatabaseEvent(instance.instance_id);
        changed.push({
          instance, 
          newState : newPriority,
          lastDatabaseEvent : {
            event_type : query.event_type,
            timestamp : query.timestamp
          }
        });
      }
    }

    return changed;
  }

  /**
   * @method startInstance
   * @description Starts an instance.  This will start the pg instance and pgRest. If the instance
   * is already starting from a prior call, this function will wait for the current request to finish.
   * A health check is performed before starting the instance.  If the instance is already
   * running, this function will return false unless opts.force is set to true.  Instances
   * are 'started' by applying the k8s deployment and service yaml files, then polling the
   * TCP port until it is ready and accepting connections.
   *
   * To use:
   * let respStart = await admin.startInstance(ctx);
   * if( respStart.starting ) {
   *  await respStart.instance;
   *  await respStart.pgrest;
   * }
   *
   * @param {String|Object} ctx 
   * @param {Object} opts
   * @param {Boolean} opts.force force start the instance even if health check passes
   *
   * @returns {Promise<Object>}
   */
  async startInstance(ctx, opts={}) {
    let instance = ctx.instance;
    let iid = instance.instance_id;

    // check if instance is already starting
    if( this.instancesStarting[iid] ) {
      logger.info('Instance already starting', instance.hostname, ctx.logSignal);
      return this.instancesStarting[iid].promise;
    }

    logger.info('Checking instance health', instance.hostname, ctx.logSignal);

    // set instance starting promise
    this.instancesStarting[iid] = {};
    this.instancesStarting[iid].promise = new Promise((resolve, reject) => {
      this.instancesStarting[iid].resolve = resolve;
      this.instancesStarting[iid].reject = reject;
    });

    // check instance health
    let health = await utils.getHealth(ctx);

    // check if pgRest services are alive
    let dbRestTcpAlive = true;
    for( let db in health?.tcpStatus?.pgRest ) {
      if( !health.tcpStatus.pgRest[db].isAlive ) {
        dbRestTcpAlive = false;
        break;
      }
    }

    if (health.state === 'RUN' &&
        health.tcpStatus.instance?.isAlive &&
        dbRestTcpAlive &&
        !opts.force) {
      logger.info('Instance running and ports are alive', instance.hostname, ctx.logSignal);
      this.resolveStart(instance);
      return {starting: false};
    }

    // log why we are starting the instance
    if( opts.force ) {
      logger.info('Force starting instance', instance.hostname, ctx.logSignal);
    } else {
      logger.info('Health test failed, starting instance', ctx.logSignal);
    }

    let response = {
      starting: true,
      instance : null,
      pgrest : null
    }

    response.instance = (async () => {
      // start the instance
      await this.models.instance.start(ctx);
      // wait for the instance to accept connections
      await utils.waitUntil(ctx.instance.hostname, ctx.instance.port);

      // hack for docker-desktop to wait for the instance DNS to be ready
      // there seems to be issues with it going up and down when instance first starts
      if( config.k8s.platform === 'docker-desktop' ) {
        logger.info('Waiting for DNS to be ready in docker-desktop', ctx.logSignal);
        await utils.sleep(5000);
      }
      console.log('INSTANCE READY');
    })();


    let dbs = await client.getInstanceDatabases(ctx);
    let dbContext = ctx.clone();

    let proms = dbs.map(db => {
      async function start() {
        // make sure instance is ready before starting pgRest
        // await response.instance;

        dbContext.database = db;
        // start pgRest
        await this.models.pgRest.start(dbContext);
        // wait for the port to be alive
        await utils.waitUntil(db.pgrest_hostname, config.pgRest.port);

        // hack for docker-desktop to wait for the instance DNS to be ready
        // there seems to be issues with it going up and down when instance first starts
        if( config.k8s.platform === 'docker-desktop' ) {
          logger.info('Waiting for DNS to be ready in docker-desktop', ctx.logSignal);
          await utils.sleep(5000);
        }

        // wait for pgRest to be actually be ready
        await waitForPgRestDb(db.pgrest_hostname, config.pgRest.port);
        console.log('DATABASE READY');
      }
      return start.bind(this);
    })
    .map(f => f());
    response.pgrest = Promise.all(proms);


    // wait for things to finish to resolve for others
    response.instance.then(() => {
      response.pgrest.then(() => {
        this.resolveStart(instance);
      }).catch(e => {
        this.rejectStart(instance, e);
      });
    }).catch(e => {
      this.rejectStart(instance, e);
    });

    return response;
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
    try {
      let resp = await fetch(`http://${host}:${port}`);
      isAlive = (resp.status !== 503);

      if( !isAlive ) {
        attempts++;
        await utils.sleep(delayTime);
      }
    } catch(e) {
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
