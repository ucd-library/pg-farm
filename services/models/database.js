import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js';
import logger from '../lib/logger.js';
import config from '../lib/config.js';
import remoteExec from '../lib/pg-helper-remote-exec.js';

class Database {

  constructor() {
    this.METADATA_FIELDS = ['title', 'description', 'shortDescription', 'url', 'tags'];
  }

  /**
   * @method getConnection
   * @description Returns a postgres user connection object for a postgres instance
   * 
   * @param {String} dbNameOrId PG Farm instance name or ID 
   * @param {String} orgNameOrId PG Farm organization name or ID 
   * @param {Object} opts
   * @param {String} opts.username optional.  Defaults to 'postgres'
   * @param {Boolean} opts.useSocket optional.  If true, returns a connection object for a unix socket
   * 
   * @returns {Promise<Object>}
   */
  async getConnection(dbNameOrId, orgNameOrId=null, opts={}) {

    if( !opts.username ) {
      opts.username = 'postgres';
    }

    let db;
    if( dbNameOrId === 'postgres' ) {
      db = {name: 'postgres'};
      opts.useSocket = true;
    } else {
      db = await this.get(dbNameOrId, orgNameOrId);
    }

    if( opts.useSocket ) {
      return {
        host : '/var/run/postgresql',
        user : opts.username,
        database : db.name || db.database_name
      }
    }

    let user;
    try {
      user = await this.models.user.get(dbNameOrId, orgNameOrId, opts.username);
    } catch(e) { 
      if( username === 'postgres' ) {
        let instance = await this.models.instance.get(db.instance_id);
        return {
          host : instance.hostname,
          port : instance.port,
          user : username,
          database : db.name || db.database_name,
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

  /**
   * @method get
   * @description Get a database by name or ID
   * 
   * @param {String} nameOrId database name or ID 
   * @param {String} orgNameOrId organization name or ID
   * @param {Array} columns optional.  columns to return
   * 
   * @returns 
   */
  async get(nameOrId, orgNameOrId, columns=null) {
    let organizationId = null;
    if( orgNameOrId ) {
      let org = await client.getOrganization(orgNameOrId);
      organizationId = org.organization_id;
    }

    return client.getDatabase(nameOrId, organizationId, columns);
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
    if( !opts.name ) {
      opts.name = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    }

    // make sure the name is prefixed with inst- (instance) prefix
    // this is to avoid conflicts with accessing the postgres instance
    // by name 
    opts.name = opts.name.replace(/^inst-/, '');

    let orgName = '';
    if( opts.organization ) {
      orgName = await this.models.organization.get(opts.organization);
      orgName = orgName.name+'-';
    }
    opts.pgrest_hostname = `rest-${orgName}${opts.name}`;

    logger.info('Creating database', title, opts);

    try {
      await client.createDatabase(title, opts);
    } catch(e) {
      logger.warn('Failed to create database in admin db', title, e.message);
    }

    let db = await this.get(opts.name, opts.organization);

    await this.ensurePgDatabase(db.instance_id, db.organization_id, db.database_name);
  }

  /**
   * @method setMetadata
   * @description Set/patch metadata for a database
   * 
   * @param {String} nameOrId database name or ID
   * @param {String} orgNameOrId database organization name or ID
   * @param {Object} metadata
   * @param {String} metadata.title optional.  The human title of the database
   * @param {String} metadata.description optional.  A description of the database.  Markdown is supported.
   * @param {String} metadata.shortDescription optional.  A short description of the database
   * @param {String} metadata.url optional.  A website for more information about the database
   * @param {Array<String>} metadata.tags optional.  An array of search tags for the database
   */
  async setMetadata(nameOrId, orgNameOrId, metadata={}) {
    if( Object.keys(metadata).length === 0 ) {
      throw new Error('No metadata fields provided');
    }

    let db = await this.get(nameOrId, orgNameOrId);
    let props = Object.keys(metadata);
    for( let prop of props ) {
      if( !this.METADATA_FIELDS.includes(prop) ) {
        throw new Error(`Invalid metadata field ${prop}`);
      }
    }

    await client.setDatabaseMetadata(db.database_id, metadata);
  }

  /**
   * @method ensurePgDatabase
   * @description Ensure a database exists on a postgres instance.  
   * Creates the database if it does not exist.
   * 
   * @param {String} instNameOrId instance name or ID
   * @param {String} orgNameOrId organization name or ID
   * @param {String} dbName database name
   */
  async ensurePgDatabase(instNameOrId, orgNameOrId, dbName) {
    let con = await this.models.instance.getConnection(instNameOrId, orgNameOrId);
    try {
      logger.info('Ensuring database '+dbName+' on instance', orgNameOrId, instNameOrId);
      await pgInstClient.ensurePgDatabase(con, dbName);
    } catch(e) {
      logger.warn(`Failed to create database ${dbName} on host ${con.host}`, e.message);
    }
  }

  /**
   * @method link
   * @description Create a foreign data wrapper and link a database
   * in pg-farm.  By default this will link the foriegn dataabases 
   * api schema to the local database with a schema of the name
   * of the remote database. Eg: "library/ca-base-layer".api -> "ca-base-layer"
   * 
   * @param {*} dbNameOrId 
   * @param {*} orgNameOrId 
   * @param {*} opts 
   */
  async link(localDb, remoteDb, remoteOrg, opts={}) {
    localDb = await this.get(localDb, config.pgInstance.organization);
    remoteDb = await this.models.database.get(remoteDb, remoteOrg);

    // logger.info('Linking database', db.database_name, 'to organization', org.name);
    let con = await this.models.database.getConnection(
      localDb.database_name,
      localDb.organization_name,
      {useSocket: true}
    );

    let dbName = remoteDb.organization_name+'/'+remoteDb.database_name;

    await pgInstClient.ensurePgSchema(con, remoteDb.database_name);
    await pgInstClient.enableExtension(con, 'postgres_fdw');
    await pgInstClient.createForeignDataWrapper(con, dbName);
    try {
      await pgInstClient.createFdwUserMapping(con, dbName, opts);
    } catch(e) {
      logger.warn('Failed to create user mapping', e.message);
    }
    await pgInstClient.importForeignSchema(con, dbName, opts);
  }

  async remoteLink(localDb, localOrg, remoteDb, remoteOrg=null, opts={}) {
    localDb = await client.getDatabase(localDb, localOrg);
    remoteDb = await client.getDatabase(remoteDb, remoteOrg);

    logger.info(`Rpc request to link database ${localDb.instance_hostname}`);
    return remoteExec(
      localDb.instance_hostname, 
      `${localDb.database_name}/link/${remoteDb.organization_name}/${remoteDb.database_name}`, 
      {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(opts)
      }
    );
  }

  async search(opts) {
    let query = '';

    if( opts.tags && !Array.isArray(opts.tags) ) {
      opts.tags = opts.tags.split(',');
    }

    if( opts.organization || opts.text || opts.tags ) {
      query += ' WHERE';
    }

    let where = [];
    let params = [];
    let countParams = [];
    let additionalSelect = '';
    opts.orderBy = 'database_title';

    if( opts.text ) {
      params.push(opts.text);
      countParams.push(opts.text);
      opts.orderBy = 'rank';
      additionalSelect += ', ts_rank_cd(tsv_content, plainto_tsquery(\'english\', $'+params.length+')) AS rank';
      where.push(` tsv_content @@ plainto_tsquery('english', $${params.length})`);
    }

    if( opts.organization ) {
      params.push(opts.organization);
      countParams.push(opts.organization);
      where.push(` organization_name = ${params.length}`);
    }

    if( opts.tags ) {
      params.push(opts.tags);
      countParams.push(opts.tags);
      where.push(` database_tags && $${params.length}`);
    }

    query += where.join(' AND ');

    let itemQuery = 'SELECT * '+additionalSelect+' FROM '+config.adminDb.views.INSTANCE_DATABASE;
    let countQuery = 'SELECT COUNT(*) AS TOTAL FROM '+config.adminDb.views.INSTANCE_DATABASE;

    countQuery += query;

    if( opts.orderBy ) {
      params.push(opts.orderBy);
      query += ' ORDER BY $'+(params.length);
    }
    if( opts.limit ) {
      params.push(opts.limit);
      query += ' LIMIT $'+(params.length);
    }
    if( opts.offset ) {
      params.push(opts.offset);
      query += ' OFFSET $'+(params.length);
    }

    itemQuery += query;

    // console.log(itemQuery, params);
    let results = await client.query(itemQuery, params);

    // console.log(countQuery, countParams);
    let count = await client.query(countQuery, countParams);

    return {
      items : results.rows,
      total : parseInt(count.rows[0].total),
      query : opts
    }
  }

  async getDatabaseUsers(dbId) {
    return pgInstClient.getDatabaseUsers(dbId);
  }

  async listSchema(orgNameOrId, dbNameOrId) {
    let con = await this.getConnection(dbNameOrId, orgNameOrId);
    let resp = await pgInstClient.listSchema(con);
    return resp.rows.map(row => row.schema_name);
  }

  async listTables(orgNameOrId, dbNameOrId, schemaName) {
    let con = await this.getConnection(dbNameOrId, orgNameOrId);
    let resp = await pgInstClient.listTables(con, schemaName);
    return resp.rows;
  }

  async getTableAccess(orgNameOrId, dbNameOrId, schemaName, tableName) {
    let con = await this.getConnection(dbNameOrId, orgNameOrId);
    let resp = await pgInstClient.getTableAccess(con, con.database, schemaName, tableName);
    
    let userMap = {};
    for( let row of resp.rows ) {
      if( !userMap[row.grantee] ) {
        userMap[row.grantee] = [];
      }
      userMap[row.grantee].push(row.privilege_type);
    }
    
    return userMap;
  }

  async getTableAccessByUser(orgNameOrId, dbNameOrId, schemaName, username) {
    let con = await this.getConnection(dbNameOrId, orgNameOrId);
    let resp = await pgInstClient.getTableAccessByUser(con, con.database, schemaName, username);
    
    let tableMap = {};
    for( let row of resp.rows ) {
      if( !tableMap[row.table_name] ) {
        tableMap[row.table_name] = [];
      }
      tableMap[row.table_name].push(row.privilege_type);
    }

    resp = await pgInstClient.getSchemaAccess(con, schemaName, username);
    let schemaAccess = resp.rows.find(row => row.role_name === username);
    if( schemaAccess ) {
      delete schemaAccess.role_name;
      delete schemaAccess.schema_name;
    } else {
      schemaAccess = {
        usage : false,
        create : false,
      }
    }

    return {
      schema : schemaAccess,
      tables: tableMap
    };
  }

}

const database = new Database();
export default database;