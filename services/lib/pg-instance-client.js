import PG from 'pg';
import pgFormat from 'pg-format';
import logger from './logger.js';
import config from './config.js';
import pgAdminClient from './pg-admin-client.js';

/**
 * @class PGInstance
 * @description A class for interacting with postgres instances.  Each query
 * will open and close a connection to the database.
 */
class PGInstance {

  constructor() {
    // https://www.postgresql.org/docs/current/ddl-priv.html 
    this.ALL_PRIVILEGE = 'ALL';
    this.ALL_PRIVILEGES = 'ALL PRIVILEGES';

    this.ALL = {
      TABLES : 'ALL TABLES',
      FUNCTIONS : 'ALL FUNCTIONS',
      SEQUENCES : 'ALL SEQUENCES',
      TYPES : 'ALL TYPES'
    }
    this.ALL_KEYWORD_ARRAY = Object.values(this.ALL);

    this.GRANTS = {
      DATABASE : {
        READ : ['CONNECT'],
        WRITE : ['CREATE', 'TEMPORARY']
      },
      SCHEMA : {
        READ : ['USAGE'],
        WRITE : ['CREATE']
      },
      TABLE : {
        READ : ['SELECT'],
        WRITE : ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
      },
      FUNCTION : {
        EXECUTE : ['EXECUTE']
      },
      SEQUENCE : {
        READ : ['SELECT'],
        WRITE : ['UPDATE', 'USAGE']
      },
      TYPE : {
        WRITE : ['USAGE']
      }
    }
  }

  async getConnection(opts={}, attempts=3) {
    let error;

    let db = await pgAdminClient.getInstanceByHostname(opts.host);
    if( db.instance_state !== 'RUN' ) {
      throw new Error('Database instance is currently in a '+db.instance_state+' state. The database instance must be in a RUN state before trying this operation.');
    }

    for( let i = 0; i < attempts; i++ ) {
      try {
        let client = new PG.Client(opts);
        await client.connect();
        return client;
      } catch(e) {
        error = e;
        logger.warn('Error connecting to database, attempt='+i, opts.host, e);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw error;
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
    query = pgFormat(`CREATE DATABASE %I`, dbName);
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

    query = pgFormat(`CREATE ROLE %I WITH LOGIN ${noinherit} PASSWORD %L`, opts.username, opts.password);
    return this.query(connection, query);
  }

  async reassignOwnedBy(connection, opts={}) {
    let query = pgFormat(`REASSIGN OWNED BY %I TO ${config.pgInstance.adminRole}`, opts.username);
    return this.query(connection, query);
  }

  /**
   * @method deletePgUser
   * @description Delete a user from the database.  This will also reassign any objects owned by 
   * the user to the admin role.
   * 
   * @param {Object} connection connection object
   * @param {Object} opts
   * @param {String} opts.username username to delete 
   * @returns {Promise<Array>} array of responses from the queries
   */
  async deletePgUser(connection, opts={}) {
    let responses = [];

    let query = pgFormat(`REVOKE ALL PRIVILEGES ON DATABASE "${connection.database}" FROM %I;`, opts.username);
    responses.push(await this.query(connection, query));

    query = pgFormat(`DROP USER %I`, opts.username);
    responses.push(await this.query(connection, query));

    return responses;
  }

  async alterPgUserPassword(connection, opts={}) {
    let query = pgFormat(`ALTER USER %I WITH PASSWORD %L`, opts.username, opts.password);
    return this.query(connection, query);
  }

  async ensurePgSchema(connection, schemaName) {
    let query = pgFormat(`CREATE SCHEMA IF NOT EXISTS %I`, schemaName);
    return this.query(connection, query);
  }

  async getTableSequenceNames(con, schemaName, tableName) {
    let resp = await this.query(con, pgFormat(`
    SELECT
        a.attname AS column_name,
        s.relname AS sequence_name
    FROM
        pg_class t
        JOIN pg_attribute a ON a.attrelid = t.oid
        JOIN pg_depend d ON d.refobjid = t.oid AND d.refobjsubid = a.attnum
        JOIN pg_class s ON s.oid = d.objid AND s.relkind = 'S'
    WHERE
        t.relname = %L
        AND t.relnamespace IN (SELECT oid FROM pg_namespace WHERE nspname = %L);`,
    tableName, schemaName));

    return resp.rows.map(row => row.sequence_name)
  };

  /**
   * @method grantSchemaObjectAccess
   * 
   * @param {*} connection connection object
   * @param {*} schemaName schema name
   * @param {*} roleName username
   * @param {*} permission pg privileges.  Can be an array of privileges or ALL
   * @param {*} objectName can be a table, function, sequence, or type or ALL TABLES, ALL FUNCTIONS, ALL SEQUENCES, ALL TYPES
   * 
   * @returns {Promise}
   */
  grantSchemaObjectAccess(connection, schemaName, roleName, permission, objectName, type) {
    if( !schemaName ) throw new Error('schemaName is required');
    if( !roleName ) throw new Error('roleName is required');
    if( !objectName ) throw new Error('objectName is required');
    if( !permission ) throw new Error('permission is required');

    // there is no revoke ALL TYPES in postgres so we have to do it manually :(
    if( objectName === this.ALL.TYPES ) {
      let query = pgFormat(`DO $$ 
        DECLARE 
            r RECORD;
        BEGIN 
            FOR r IN 
                SELECT n.nspname as schema_name, t.typname as type_name 
                FROM pg_type t 
                LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
                WHERE n.nspname = %L AND
                t.typtype = 'e'
            LOOP 
                EXECUTE 'GRANT ${permission} ON TYPE ' || quote_ident(r.schema_name) || '.' || quote_ident(r.type_name) || ' TO "${roleName}"';
            END LOOP; 
        END $$;`, schemaName);
      logger.info('Running revoke all types query', query);
      return this.query(connection, query);
    } else if( !this.ALL_KEYWORD_ARRAY.includes(objectName) ) {
      objectName = `${type} "${schemaName}"."${objectName}"`;
    } else {
      objectName += ` IN SCHEMA "${schemaName}"`;
    }


    if( Array.isArray(permission) ) { 
      permission = permission.join(', ');
    }

    let query = pgFormat(`GRANT ${permission} ON ${objectName} TO %I`, roleName);
    logger.info('Running grant schema object query', query);

    return this.query(connection, query);
  }

  revokeSchemaObjectAccess(connection, schemaName, roleName, permission, objectName, type) {
    if( !schemaName ) throw new Error('schemaName is required');
    if( !roleName ) throw new Error('roleName is required');
    if( !permission ) throw new Error('permission is required');
    if( !objectName ) throw new Error('objectName is required');

    // there is no revoke ALL TYPES in postgres so we have to do it manually :(
    if( objectName === this.ALL.TYPES ) {
      let query = pgFormat(`DO $$ 
        DECLARE 
            r RECORD;
        BEGIN 
            FOR r IN 
                SELECT n.nspname as schema_name, t.typname as type_name 
                FROM pg_type t 
                LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
                WHERE n.nspname = %L AND
                t.typtype = 'e'
            LOOP 
                EXECUTE 'REVOKE ${permission} ON TYPE ' || quote_ident(r.schema_name) || '.' || quote_ident(r.type_name) || ' FROM "${roleName}"';
            END LOOP; 
        END $$;`, schemaName);
      logger.info('Running revoke all types query', query);
      return this.query(connection, query);
    } else if( !this.ALL_KEYWORD_ARRAY.includes(objectName) ) {
      objectName = `${type} "${schemaName}"."${objectName}"`;
    } else {
      objectName += ` IN SCHEMA "${schemaName}"`;
    }

    if( Array.isArray(permission) ) {
      permission = permission.join(', ');
    }

    let query = pgFormat(`REVOKE ${permission} ON ${objectName} FROM %I`, roleName);
    logger.info('Running revoke schema object query', query);
    return this.query(connection, query);
  }

  /**
   * @method grantSchemaAccess
   * 
   * @param {*} connection 
   * @param {*} schemaName 
   * @param {*} roleName 
   * @param {*} permission 
   * @returns 
   */
  grantSchemaAccess(connection, schemaName, roleName, permission) {
    if( Array.isArray(permission) ) {
      permission = permission.join(', ');
    }
    let query = pgFormat(`GRANT ${permission} ON SCHEMA "%s" TO "%s"`, schemaName, roleName);
    return this.query(connection, query);
  }

  revokeSchemaAccess(connection, schemaName, roleName, permission) {
    if( Array.isArray(permission) ) {
      permission = permission.join(', ');
    }
    let query = pgFormat(`REVOKE ${permission} ON SCHEMA "%s" FROM "%s"`, schemaName, roleName);
    return this.query(connection, query);
  }

  grantDatabaseAccess(connection, dbName, roleName, permission) {
    if( Array.isArray(permission) ) {
      permission = permission.join(', ');
    }
    let query = pgFormat(`GRANT ${permission} ON DATABASE "%s" TO "%s"`, dbName, roleName);
    return this.query(connection, query);
  }

  revokeDatabaseAccess(connection, dbName, roleName, permission) {
    if( Array.isArray(permission) ) {
      permission = permission.join(', ');
    }
    let query = pgFormat(`REVOKE ${permission} ON DATABASE "%s" TO "%s"`, dbName, roleName);
    return this.query(connection, query);
  }

  async dropUser(connection, username) {
    let query = pgFormat(`REASSIGN OWNED BY %I to ${config.pgInstance.adminRole}`, username); 
    await this.query(connection, query);

    query = pgFormat(`DROP USER %I`, username);
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

  listDatabases(connection) {
    let query = `SELECT datname FROM pg_database WHERE datistemplate = false`;
    return this.query(connection, query);
  }

  /**
   * @method listSchema
   * 
   * @description List all schemas in the database
   * 
   * @param {Object} connection
   * 
   * @returns {Promise}
   **/
  listSchema(connection) {
    let query = `SELECT schema_name, schema_owner FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog')`;
    return this.query(connection, query);
  }

  getSchemaAccess(connection, schemaName) {
    let query = pgFormat(`SELECT
          n.nspname AS schema_name,
          r.rolname AS role_name,
          CASE 
            WHEN has_schema_privilege(r.rolname, n.nspname, 'USAGE') THEN 'USAGE' 
            ELSE NULL 
          END AS usage_priv,
          CASE 
            WHEN has_schema_privilege(r.rolname, n.nspname, 'CREATE') THEN 'CREATE' 
            ELSE NULL 
          END AS create_priv
      FROM
          pg_namespace n
          CROSS JOIN pg_roles r
      WHERE
          n.nspname = %L`, schemaName);
    return this.query(connection, query);
  }


  /**
   * @method listTables
   * 
   * @description List all tables in the schema
   * 
   * @param {Object} connection
   * 
   * @returns {Promise}
   **/
  listTables(connection, schemaName) {
    let query = pgFormat(`SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema = %L`, schemaName);
    return this.query(connection, query);
  }

  getDatabaseUsers(connection) {
    let query = `SELECT rolname FROM pg_roles`;
    return this.query(connection, query);
  }

  /**
   * @method getTableAccess
   * @description Get the access for a table
   * 
   * @param {Object} connection 
   * @param {String} databaseName
   * @param {String} schemaName 
   * @param {String} tableName 
   * @returns 
   */
  getTableAccess(connection, databaseName, schemaName, tableName) {
    let query = pgFormat(`
      SELECT * FROM 
        information_schema.role_table_grants 
      WHERE 
        table_catalog = %L and
        table_schema = %L and 
        table_name = %L`, 
      databaseName, schemaName, tableName);
    return this.query(connection, query);
  }

  /**
   * @method getTableAccessByUser
   * @description Get the access for a table by user
   * 
   * @param {Object} connection
   * @param {String} databaseName
   * @param {String} schemaName
   * @param {String} username
   * 
   * @returns {Promise}
   */
  getTableAccessByUser(connection, databaseName, schemaName, username) {
    let query = pgFormat(`
      SELECT * FROM 
        information_schema.role_table_grants 
      WHERE 
        table_catalog = %L AND
        table_schema = %L AND 
        grantee = %L`, 
      databaseName, schemaName, username);
    return this.query(connection, query);
  }

  getUsageAccess(connection, schemaName) {
    let query = pgFormat(`SELECT * FROM information_schema.usage_privileges WHERE schema_name = %L`, schemaName);
    return this.query(connection, query);
  }

  getDatabaseAccess(connection, dbName) {
    let query = pgFormat(`SELECT
        r.rolname AS role_name,
        d.datname AS database_name,
        CASE 
            WHEN has_database_privilege(r.rolname, d.datname, 'CONNECT') THEN 'CONNECT' 
            ELSE NULL 
        END AS connect_priv,
        CASE 
            WHEN has_database_privilege(r.rolname, d.datname, 'CREATE') THEN 'CREATE' 
            ELSE NULL 
        END AS create_priv,
        CASE 
            WHEN has_database_privilege(r.rolname, d.datname, 'TEMPORARY') THEN 'TEMPORARY' 
            ELSE NULL 
        END AS temporary_priv
    FROM
        pg_database d,
        pg_roles r
    WHERE
        d.datname = %L
    ORDER BY
        d.datname;`, dbName);
    return this.query(connection, query);
  }


}

let inst = new PGInstance();
export default inst;