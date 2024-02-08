import client from '../../../lib/pg-admin-client.js';
import pgInstClient from '../../../lib/pg-client.js';
import pgFormat from 'pg-format';
import logger from '../../../lib/logger.js';
import config from '../../../lib/config.js';

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
  async getConnection(dbNameOrId, orgNameOrId=null, username='postgres') {
    let user;
    try {
      user = await this.models.user.get(dbNameOrId, orgNameOrId, username);
    } catch(e) { 
      if( username === 'postgres' ) {
        let db = await this.get(dbNameOrId, orgNameOrId);
        let instance = await this.models.instance.get(db.instance_id);
        return {
          host : instance.hostname,
          port : instance.port,
          user : username,
          database : db.name,
          password : config.pgInstance.adminInitPassword
        }
      }
      throw e;
    }

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
  async create(title, opts) {
    // let instance = await this.models.instance.get(
    //   opts.instance,
    //   opts.organization
    // );

    // if( opts.organization ) {
    //   let org = await this.models.organization.get(opts.organization);
    //   opts.organization_id = org.organization_id;
    // }
    // if( !opts.organization_id ) {
    //   opts.organization_id = null;
    // }
    if( !opts.name ) {
      opts.name = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    }

    await client.createDatabase(title, opts);

    // register postgres database
    await client.createDatabase('postgres', opts);

    let db = await this.get(opts.name, opts.organization);

    try {
      let formattedQuery = pgFormat('CREATE DATABASE %s', opts.name);
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
      logger.warn(`Failed to create database ${opts.name} on host ${db.instance_hostname}`, e);
    }

    // create postgres user to admin database, resets password
    try {
      await this.models.user.create(db.instance_id, db.organization_id, 'postgres');
    } catch(e) {
      logger.warn(`Failed to create postgres user for database ${opts.name} on instance ${db.instance_name}`, e);
    }

    // add public user
    try {
      await this.models.user.create(db.instance_id, db.organization_id, config.pgInstance.publicRole.username);
    } catch(e) {
      logger.warn(`Failed to create public user ${config.pgInstance.publicRole.username}: ${db.instance_name}`, e);
    }
  }

}

const database = new Database();
export default database;