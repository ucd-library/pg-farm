import client from '../../../lib/pg-admin-client.js';
import pgInstClient from '../../../lib/pg-instance-client.js';
import utils from '../../../lib/utils.js';
import kubectl from '../../../lib/kubectl.js';
import config from '../../../lib/config.js';
import logger from '../../../lib/logger.js';
import modelUtils from './utils.js';
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

  async createUser(instNameOrId, orgNameOrId, user, type='USER') {
    console.log({instNameOrId, orgNameOrId, user, type})
    return this.models.user.create(instNameOrId, orgNameOrId, user, type);
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
    let name = opts.name || opts.database;
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
      opts.instance = 'inst-'+name;
    }

    let instance = await this.models.instance.exists(opts.instance, opts.organization);
    if( !instance ) {
      let iOpts = {};
      if( opts.organization ) iOpts.organization = opts.organization;
      instance = await this.models.instance.create(opts.instance, iOpts);
    }
    opts.instance = instance.name;

    let database = await this.models.database.exists(name, opts.organization);
    if( !database ) {
      await this.models.database.create(name, opts);
      database = await this.models.database.get(name, opts.organization); 
    }


    // initialize the database for PostgREST roles and schem
    await this.models.pgRest.initDb(instance.name, opts.organization, database.database_name);

    // start pg rest once instance is running
    await this.models.pgRest.start(name, opts.organization);
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


  async stopInstance(instNameOrId, orgNameOrId) {
    await this.models.instance.stop(instNameOrId, orgNameOrId);
    await this.models.pgRest.stop(instNameOrId, orgNameOrId);
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

  async startDatabase(nameOrId, orgNameOrId, opts={}) {
    let instance;
    if( opts.isDb ) {
      instance = await this.models.instance.getByDatabase(nameOrId, orgNameOrId);
      nameOrId = instance.name;
    } else {
      instance = await this.models.instance.get(nameOrId, orgNameOrId);
    }
    let iid = instance.id;


    if( this.instancesStarting[iid] ) {
      return this.instancesStarting[iid].promise;
    }

    this.instancesStarting[iid] = {};
    this.instancesStarting[iid].promise = new Promise((resolve, reject) => {
      this.instancesStarting[iid].resolve = resolve;
      this.instancesStarting[iid].reject = reject;
    });

    let isPortAlive = await utils.isAlive(
      instance.hostname,
      instance.port
    );

    // TODO: split out pgRest and instance test.
    if (!isPortAlive) {
      logger.info('Port test failed, starting instance', instance.hostname);
      
      let pgRestPromise = this.models.pgRest.start(database);

      await this.models.instance.start(database);
      await utils.waitUntil(instance.hostname, instance.port);

      if( opts.waitForPgRest ) {
        await pgRestPromise;
        await utils.waitUntil('pgrest-'+instance.name, config.pgRest.port);
        await waitForPgRestDb('http://pgrest-'+instance.name, config.pgRest.port);
      }

      resolveStart(database);

      return true;
    }

    resolveStart(database);
    return false;
  }

}

function resolveStart(instance) {
  this.instancesStarting[instance].resolve(instance);
  delete this.instancesStarting[instance];
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