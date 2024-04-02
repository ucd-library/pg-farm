import PG from 'pg';
import pgFormat from 'pg-format';
import logger from './logger.js';
import config from './config.js';

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
    let query = pgFormat(`CREATE SCHEMA IF NOT EXISTS "%s"`, schemaName);
    return this.query(connection, query);
  }

  async getTableSequenceNames(con, schemaName, tableName) {
    let resp = await this.query(con, `
    SELECT
        a.attname AS column_name,
        s.relname AS sequence_name
    FROM
        pg_class t
        JOIN pg_attribute a ON a.attrelid = t.oid
        JOIN pg_depend d ON d.refobjid = t.oid AND d.refobjsubid = a.attnum
        JOIN pg_class s ON s.oid = d.objid AND s.relkind = 'S'
    WHERE
        t.relname = $1 
        AND t.relnamespace IN (SELECT oid FROM pg_namespace WHERE nspname = $2);`,
    [tableName, schemaName]);

    return resp.rows.map(row => row.sequence_name)
  };

  /**
   * @method grantAllTableAccess
   * 
   * @param {*} connection 
   * @param {*} schemaName 
   * @param {*} roleName 
   * @param {*} permission 
   * @param {*} tableName
   * 
   * @returns 
   */
  grantTableAccess(connection, schemaName, roleName, permission='ALL', tableName='ALL TABLES') {
    if( Array.isArray(permission) ) { 
      permission = permission.join(', ');
    }
    let query = pgFormat(`GRANT ${permission} ON ALL TABLES IN SCHEMA "%s" TO "%s"`, schemaName, roleName);
    return this.query(connection, query);
  }

  grantSchemaUsage(connection, schemaName, roleName, permission='USAGE') {
    if( Array.isArray(permission) ) {
      permission = permission.join(', ');
    }
    let query = pgFormat(`GRANT ${permission} ON SCHEMA "%s" TO "%s"`, schemaName, roleName);
    return this.query(connection, query);
  }

  grantFnUsage(connection, schemaName, roleName) {
    let query = pgFormat(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "%s" to "%s"`, schemaName, roleName);
    return this.query(connection, query);
  }

  grantSequenceUsage(connection, schemaName, roleName, seqName=null) {
    let query;
    if( !seqName ) {
      query = pgFormat(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "%s" to "%s"`, schemaName, roleName);
    } else {
      query = pgFormat(`GRANT USAGE, SELECT ON "%s".${seqName} to "%s"`, schemaName, roleName);
    }

    return this.query(connection, query);
  }

  enableExtension(connection, extensionName) {
    let query = pgFormat(`CREATE EXTENSION IF NOT EXISTS %s`, extensionName);
    return this.query(connection, query);
  }

  createForeignDataWrapper(connection, databaseName) {
    let host = new URL(config.appUrl).hostname;
    let query = pgFormat(`CREATE SERVER IF NOT EXISTS "%s" FOREIGN DATA WRAPPER postgres_fdw OPTIONS (host '%s', port '5432', dbname '%s');`, databaseName, host, databaseName);
    return this.query(connection, query);
  }

  createFdwUserMapping(connection, serverName, opts={}) {
    if( !opts.roleName ) opts.roleName = 'public';
    if( !opts.remoteRole ) opts.remoteRole = config.pgInstance.publicRole;
    let query = pgFormat(`CREATE USER MAPPING IF NOT EXISTS FOR "%s" SERVER "%s" OPTIONS (user '%s', password '%s');`, opts.roleName, serverName, opts.remoteRole.username, opts.remoteRole.password);
    return this.query(connection, query);
  }

  importForeignSchema(connection, serverName, opts={}) {
    if( !opts.remoteSchema ) opts.remoteSchema = config.pgRest.schema;
    if( !opts.localSchema ) opts.localSchema = serverName.split('/').pop();
    let query = pgFormat(`IMPORT FOREIGN SCHEMA "%s" FROM SERVER "%s" INTO "%s";`, opts.remoteSchema, serverName, opts.localSchema);
    return this.query(connection, query);
  }

}

let inst = new PGInstance();
export default inst;