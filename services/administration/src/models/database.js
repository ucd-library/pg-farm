import client from '../../../lib/pg-admin-client.js';
import pgInstClient from '../../../lib/pg-client.js';
import pgFormat from 'pg-format';
import logger from '../../../lib/logger.js';
import config from '../../../lib/config.js';
import utils from '../../../lib/utils.js';

class Database {

  /**
   * @method getConnection
   * @description Returns a postgres user connection object for a postgres instance
   * 
   * @param {String} nameOrId PG Farm instance name or ID 
   * @param {String} orgNameOrId PG Farm organization name or ID 
   * @param {String} username optional.  Defaults to 'postgres'
   * 
   * @returns {Promise<Object>}
   */
  async getConnection(nameOrId, orgNameOrId=null, username='postgres') {
    let user = await this.getUser(nameOrId, orgNameOrId, username);

    return {
      host : user.instance_hostname,
      port : user.instance_port,
      user : user.username,
      database : user.database_name,
      password : user.password
    };
  }

  async get(nameOrId, orgNameOrId) {
    let organizationId = null;
    if( orgNameOrId ) {
      let org = await client.getOrganization(orgNameOrId);
      organizationId = org.organization_id;
    }

    return client.getDatabase(nameOrId, organizationId);
  }

  async exists(name, orgNameOrId) {
    try {
      let db = await this.get(name, orgNameOrId);
      return db;
    } catch(e) {}

    return false;
  }

  /**
   * @method create
   * @description Create a new database
   * 
   * @param {*} name 
   * @param {*} opts 
   */
  async create(name, opts) {
    if( opts.organization ) {
      let org = await client.getOrganization(opts.organization);
      opts.organization_id = org.organization_id;
    }
    if( !opts.organization_id ) {
      opts.organization_id = null;
    }

    await client.createDatabase(name, opts);

    let db = await this.get(name, opts.organization_id);

    try {
      let formattedQuery = pgFormat('CREATE DATABASE %s', name);
      let resp = await pgInstClient.query(
        {
          host : db.instance_hostname,
          port : db.instance_port,
          database : 'postgres',
          user  : config.pgInstance.adminRole,
          password : config.pgInstance.adminInitPassword
        }, 
        formattedQuery
      );
    } catch(e) {
      logger.warn(`Failed to create database ${name} on host ${db.instance_hostname}`, e);
    }

    // create postgres user to admin database, resets password
    await this.createUser(db.database_id, db.instance_id, 'postgres');
  
    // add public user
    try {
      await this.createUser(db.database_id, db.instance_id, config.pgInstance.publicRole.username);
    } catch(e) {
      logger.warn(`Failed to create public user ${config.pgInstance.publicRole.username}: ${instNameOrId}`, e);
    }
  }

  /**
   * @method addUser
   * @description Adds a user to a postgres database
   * 
   * @param {String} nameOrId  PG Farm database name or ID 
   * @param {String} orgNameOrId Organization name or ID. Can be null.
   * @param {String} user username 
   * @param {String} type USER, ADMIN, or PUBLIC.  Defaults to USER. 
   * @param {String} password optional.  defined password.  If not 
   * provided, a random password will be generated.
   * 
   * @returns {Promise}
   */
  async createUser(nameOrId, orgNameOrId=null, user, type='USER', password, noinherit=false) {
    let db = await this.get(nameOrId, orgNameOrId);

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
    await client.createDatabaseUser(db.database_id, user, password, type);

    // postgres user already exists.  Update password
    if( user === config.pgInstance.adminRole ) {
      await this.resetPassword(db.database_id, config.pgInstance.adminRole);
      return;
    }

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

  async getUser(nameOrId, orgNameOrId=null, username) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_DATABSE_USERS}
      WHERE 
        (database_name = $1 OR database_id=try_cast_uuid($1)) AND
        (instance_name = $1 OR instance_id=try_cast_uuid($1)) AND 
        username = $2
    `, [nameOrId, orgNameOrId, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    } 

    return resp.rows[0];
  }

    /**
   * @method resetUserPassword
   * @description Resets a user's password to a random password
   * 
   * @param {String} instNameOrId PG Farm instance name or ID
   * @param {String} orgNameOrId PG Farm organization name or ID
   * @param {String} user 
   * @param {String} password 
   * 
   * @returns {Promise}
   */
  async resetPassword(instNameOrId, orgNameOrId, user, password) {
    // TODO: should this just force the instance on??
    let con = await this.getConnection(instNameOrId, orgNameOrId);

    // generate random password if not provided
    if( !password ) password = utils.generatePassword();

    // update database
    // TODO: move this to client
    await client.query(
      `UPDATE ${config.adminDb.tables.DATABASE_USERS} 
      SET password = $2 
      WHERE username = $1 AND instance_id = $3`, 
      [user, password, con.id]
    );

    await this.setDbPassword(instNameOrId, orgNameOrId, user, password);
  }

  async setDbPassword(instNameOrId, orgNameOrId, user, password) {
    let con = await this.getConnection(instNameOrId, orgNameOrId);
    let user = await this.getUser(instNameOrId, orgNameOrId, user);

    // update postgres instance users password
    let formattedQuery = pgFormat('ALTER USER %s WITH PASSWORD %L', user, password);
    let resp = await pgInstClient.query(
      con, 
      formattedQuery
    );

    return resp;
  }


}