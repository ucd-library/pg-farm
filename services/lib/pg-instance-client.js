import PG from 'pg';
import pgFormat from 'pg-format';
import logger from './logger.js';

/**
 * @class PGInstance
 * @description A class for interacting with postgres instances.  Each query
 * will open and close a connection to the database.
 */
class PGInstance {

  async getConnection(opts={}) {
    const client = new PG.Client(opts);
    await client.connect()
    return client;
  }

  async query(connection, query, args) {
    const client = await this.getConnection(connection);
    
    try {
      let result = await client.query(query, args);
      await client.end();
      return result;
    } catch(e) {
      await client.end();
      throw e;
    }
  }

  async ensurePgDatabase(connection, dbName) {
    let query = pgFormat(`SELECT FROM pg_database WHERE datname = %L`, dbName);
    let resp = await this.query(connection, query);
    let exists = (resp.rows.length > 0);

    if( exists ) return;

    logger.info('Creating database '+dbName+' on instance', connection.host);
    query = pgFormat(`CREATE DATABASE %s`, dbName);
    return this.query(connection, query);
  }

  async createOrUpdatePgUser(connection, opts={}) {
    let query = pgFormat(`SELECT * FROM pg_catalog.pg_user WHERE usename = %L`, opts.username);
    let resp = await this.query(connection, query);
    let exists = (resp.rows.length > 0);

    if( exists ) {
      return this.alterPgUserPassword(connection, opts);
    }

    let noinherit = '';
    if( opts.noinherit ) {
      noinherit = 'NOINHERIT';
    }

    query = pgFormat(`CREATE ROLE "%s" WITH LOGIN ${noinherit} PASSWORD %L`, opts.username, opts.password);
    return this.query(connection, query);
  }

  async alterPgUserPassword(connection, opts={}) {
    let query = pgFormat(`ALTER USER "%s" WITH PASSWORD %L`, opts.username, opts.password);
    return this.query(connection, query);
  }

  async ensurePgSchema(connection, schemaName) {
    let query = pgFormat(`CREATE SCHEMA IF NOT EXISTS %s`, schemaName);
    return this.query(connection, query);
  }

}

let inst = new PGInstance();
export default inst;