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


  getInstance(instNameOrId) {
    return client.getInstance(instNameOrId);
  }

  async stopInstance(instNameOrId, orgNameOrId) {
    await database.stop(instNameOrId, orgNameOrId);
    await pgRest.stop(instNameOrId, orgNameOrId);
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