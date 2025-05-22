import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js';
import logger from '../lib/logger.js';
import config from '../lib/config.js';
import utils from './utils.js';
import ucdIamApi from '../lib/ucd-iam-api.js';
import {getContext} from '../lib/context.js';

class Database {

  constructor() {
    this.METADATA_FIELDS = ['title', 'description', 'shortDescription', 'url', 'tags', 'icon', 'brandColor'];
  }

  /**
   * @method getConnection
   * @description Returns a postgres user connection object for a postgres instance
   *
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {String} opts.database optional.  Defaults to ctx.database.name
   * @param {String} opts.username optional.  Defaults to 'postgres'
   * @param {Boolean} opts.useSocket optional.  If true, returns a connection object for a unix socket
   *
   * @returns {Promise<Object>}
   */
  async getConnection(ctx, opts={}) {
    ctx = getContext(ctx);

    if( !opts.username ) {
      opts.username = 'postgres';
    }

    let db;
    if( opts.database ) {
      db = {name: opts.database.name};
    } else {
      db = ctx.database
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
      user = await this.models.user.get(ctx, opts.username);
    } catch(e) {
      // fall back to the default user
      if( opts.username === 'postgres' ) {
        let instance = ctx.instance;
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
  async get(ctx, columns=null) {
    return client.getDatabase(ctx, columns);
  }

  /**
   * @method exists
   * @description Check if a database exists.  This will return false if the database
   * does not exist or will return the database object if it does exist.
   *
   * @param {String|Object} ctx context object or id
   * @returns
   */
  async exists(ctx) {
    try {
      let db = await this.get(ctx);
      return db;
    } catch(e) {}

    return false;
  }

  /**
   * @method create
   * @description Create a new database
   *
   * @param {*} ctx
   */
  async create(ctx) {
    ctx = getContext(ctx);

    let opts = {
      title: ctx.database.title,
      name: utils.cleanInstDbName(ctx.database.name),
      instance: ctx.instance.name,
      short_description: ctx.organization.short_description,
      description: ctx.organization.description,
      tags: ctx.organization.tags,
      url: ctx.organization.url
    };

    let orgName = '';
    if( ctx.organization ) {
      orgName = await this.models.organization.get(ctx);
      orgName = orgName.name+'-';
      opts.organization = orgName.name;
    }
    opts.pgrest_hostname = `rest-${orgName}${database.name}`;

    try {
      logger.info('Creating database', ctx.logSignal);

      await client.createDatabase(opts);
    } catch(e) {
      logger.warn('Failed to create database in admin db', {e}, ctx.logSignal);
    }

    let db = await this.get(ctx);

    await this.ensurePgDatabase(db.instance_id, db.organization_id, db.database_name);
  }

  /**
   * @method setMetadata
   * @description Set/patch metadata for a database
   *
   * @param {Object} ctx context object or id
   * @param {Object} metadata
   * @param {String} metadata.title optional.  The human title of the database
   * @param {String} metadata.description optional.  A description of the database.  Markdown is supported.
   * @param {String} metadata.shortDescription optional.  A short description of the database
   * @param {String} metadata.icon optional.  An icon slug for the database e.g. 'fa.solid.database'
   * @param {String} metadata.brandColor optional.  A ucd brand color slug for the database e.g. 'putah-creek'
   * @param {String} metadata.url optional.  A website for more information about the database
   * @param {Array<String>} metadata.tags optional.  An array of search tags for the database
   */
  async update(ctx, metadata={}) {
    if( Object.keys(metadata).length === 0 ) {
      throw new Error('No metadata fields provided');
    }

    let db = ctx.database;
    let props = Object.keys(metadata);
    for( let prop of props ) {
      if( !this.METADATA_FIELDS.includes(prop) ) {
        throw new Error(`Invalid metadata field ${prop}`);
      }
    }

    await client.setDatabaseMetadata(db.database_id, metadata);
  }

  /**
   * @method makeFeatured
   * @description Add a database to an organization's or the global featured list
   * @param {Object} ctx - database name or ID
   * @param {Object} opts - options
   * @param {Number} opts.orderIndex - order index of the database in the list
   * @param {Boolean} opts.organizationList - if true, add to organization's featured list.  If false or not provided, add to global featured list
   */
  async makeFeatured(ctx, opts={}) {
    let db = ctx.database;

    const featured = await this.getFeatured(opts.organizationList ? ctx : null);
    const orderIndex = Number(opts.orderIndex) || 0;

    const selfInList = featured.find(f => f.database_id === db.database_id);
    if( selfInList ) {
      if (orderIndex === selfInList.order_index || featured.length === 1) {
        return;
      }
      const i = featured.findIndex(f => f.database_id === db.database_id);
      featured.splice(i, 1);
      featured.splice(orderIndex, 0, selfInList);
    } else {
      featured.splice(orderIndex, 0, {
        database_id : db.database_id,
        database_name : db.name
      });
    }

    for (let i = 0; i < featured.length; i++) {
      const item = featured[i];
      if ( !item.database_featured_id ){
        const o = {orderIndex: i, organizationList: opts.organizationList}
        await client.addFeaturedDatabase(db.database_id, db.organization_id, o);
        continue;
      }
      await client.setFeaturedDatabaseOrder(item.database_featured_id, i);
    }
  }

  /**
   * @method removeFeatured
   * @description Remove a database from an organization's or the global featured list
   * @param {Object} ctx - database name or ID
   * @param {Boolean} organizationList - if true, remove from organization's featured list; else, remove from global featured list
   */
  async removeFeatured(ctx, organizationList) {
    let db = ctx.database;
    let featured = await this.getFeatured(organizationList ? ctx : null);

    let item = featured.find(f => f.database_id === db.database_id);
    if( !item ) {
      throw new Error('Database is not in the featured list');
    }
    await client.removeFeaturedDatabase(item.database_featured_id);
    featured.filter(f => f.database_id !== db.database_id);
    for (let i = 0; i < featured.length; i++) {
      const item = featured[i];
      await client.setFeaturedDatabaseOrder(item.database_featured_id, i);
    }
  }

  /**
   * @method getFeatured
   * @description Get the featured databases for an organization
   *
   * @param {String|Object} ctx context object or id
   * @returns
   */
  async getFeatured(ctx) {
    return client.getFeaturedDatabases(ctx?.organization?.organization_id);
  }

  /**
   * @method ensurePgDatabase
   * @description Ensure a database exists on a postgres instance.
   * Creates the database if it does not exist.
   *
   * @param {String|Object} ctx context object or id
   */
  async ensurePgDatabase(ctx) {
    let con = await this.models.instance.getConnection(ctx);
    try {
      logger.info('Ensuring database on instance', ctx.logSignal);
      await pgInstClient.ensurePgDatabase(con, ctx.database.name);
    } catch(e) {
      logger.warn(`Failed to create database on host ${con.host}`, {e}, ctx.logSignal);
    }
  }

  /**
   * @method link
   * @description Create a foreign data wrapper and link a database
   * in pg-farm.  By default this will link the foriegn dataabases
   * api schema to the local database with a schema of the name
   * of the remote database. Eg: "library/ca-base-layer".api -> "ca-base-layer"
   *
   * @param {String} localOrg
   * @param {String} localDb
   * @param {String} remoteDb
   * @param {String} remoteOrg
   * @param {Object} opts
   * @param {String} opts.localSchema optional.  The schema to link to.  Defaults to the remote database name
   * @param {String} opts.remoteSchema optional.  The schema to link from on the remote server.  Default is: api
   */
  async link(localOrg, localDb, remoteDb, remoteOrg, opts={}) {
    localDb = await this.get(localDb, localOrg);
    remoteDb = await this.get(remoteDb, remoteOrg);

    // logger.info('Linking database', db.database_name, 'to organization', org.name);
    let con = await this.models.database.getConnection(
      localDb.database_name,
      localDb.organization_name
    );

    let dbName = remoteDb.organization_name+'/'+remoteDb.database_name;
    let localSchema = opts.localSchema || remoteDb.database_name;
    let remoteSchema = opts.remoteSchema || 'api';

    await pgInstClient.ensurePgSchema(con, remoteDb.database_name);
    await pgInstClient.enableExtension(con, 'postgres_fdw');
    await pgInstClient.createForeignDataWrapper(con, dbName);
    try {
      await pgInstClient.createFdwUserMapping(con, dbName, opts);
    } catch(e) {
      logger.warn('Failed to create user mapping', e.message);
    }
    await pgInstClient.importForeignSchema(con, dbName, {localSchema, remoteSchema});
  }

  getSearchQueries(opts){
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
    let additionalJoin = '';
    if ( opts.orderBy && !['database_title', 'rank'].includes(opts.orderBy) ) {
      opts.orderBy = 'database_title';
    }
    opts.orderDirection = opts.orderBy === 'rank' ? 'DESC' : 'ASC';

    if( opts.text ) {
      params.push(opts.text);
      countParams.push(opts.text);
      if ( !opts.orderBy ) {
        opts.orderBy = 'rank';
        opts.orderDirection = 'DESC';
      }
      additionalSelect += ', ts_rank_cd(tsv_content, plainto_tsquery(\'english\', $'+params.length+')) AS rank';
      where.push(` tsv_content @@ plainto_tsquery('english', $${params.length})`);
    } else {
      opts.orderBy = 'database_title';
    }

    if( opts.organization ) {
      params.push(opts.organization);
      countParams.push(opts.organization);
      where.push(` organization_name = $${params.length}`);

      if ( opts.excludeFeatured ) {
        additionalJoin += ` LEFT JOIN
        ${config.adminDb.tables.DATABASE_FEATURED} fd ON
        fd.database_id = ${config.adminDb.views.INSTANCE_DATABASE}.database_id
        AND fd.organization_id = ${config.adminDb.views.INSTANCE_DATABASE}.organization_id
        `;
        where.push(` fd.database_id IS NULL`);
      }
    }

    if( opts.tags ) {
      params.push(opts.tags);
      countParams.push(opts.tags);
      where.push(` database_tags && $${params.length}`);
    }

    query += where.join(' AND ');

    let itemQuery = 'SELECT * '+additionalSelect+' FROM '+config.adminDb.views.INSTANCE_DATABASE + additionalJoin;
    let countQuery = 'SELECT COUNT(*) AS TOTAL FROM '+config.adminDb.views.INSTANCE_DATABASE + additionalJoin;

    countQuery += query;

    if( opts.orderBy ) {
      query += ' ORDER BY '+opts.orderBy;
      query += ' '+opts.orderDirection;
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

    return {
      itemQuery,
      countQuery,
      params,
      countParams
    };
  }

  async aggregations(aggs, searchOpts={}) {
    if ( !Array.isArray(aggs) ) {
      aggs = [aggs];
    }

    const formatItems = (items, value, label) => {
      return items.map(item => {
        return {
          value: item[value],
          label: item[label],
          count: parseInt(item.total)
        };
      });
    }

    const results = [];
    let {countQuery, countParams} = this.getSearchQueries(searchOpts);

    if ( aggs.includes('organization') ) {
      let query = countQuery.split(config.adminDb.views.INSTANCE_DATABASE).slice(1).join(config.adminDb.views.INSTANCE_DATABASE);
      query = `
      SELECT organization_name, organization_title, COUNT(*) AS total
      FROM ${config.adminDb.views.INSTANCE_DATABASE} ${query}
      GROUP BY organization_name, organization_title
      ORDER BY organization_title
      `;

      let res = await client.query(query, countParams);
      results.push({
        key: 'organization',
        items: formatItems(res.rows, 'organization_name', 'organization_title')
      });
    }

    if ( aggs.includes('tag') ){
      let query = countQuery.split(config.adminDb.views.INSTANCE_DATABASE).slice(1).join(config.adminDb.views.INSTANCE_DATABASE);
      query = `
        SELECT unnest(database_tags) AS tag, COUNT(*) AS total
        FROM ${config.adminDb.views.INSTANCE_DATABASE} ${query}
        GROUP BY tag
        ORDER BY tag
      `;
      let res = await client.query(query, countParams);
      results.push({
        key: 'tag',
        items: formatItems(res.rows, 'tag', 'tag')
      });
    }

    if ( !results.length ) {
      throw new Error('No aggregations requested');
    }

    return results;
  }

  async search(opts) {
    let {itemQuery, countQuery, params, countParams} = this.getSearchQueries(opts);

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

  /**
   * @method getDatabaseUsers
   *
   * @param {String|Object} ctx context object or id
   * @returns
   */
  async getDatabaseUsers(ctx) {
    let database = ctx.database;

    let con = await this.getConnection(ctx);
    let resp = await pgInstClient.getDatabaseUsers(con);

    let access = await pgInstClient.getDatabaseAccess(con, database.name);
    access = access.rows;

    const userColumns = ['u.username', 'u.user_id', 'type', 'u.first_name', 'u.last_name', 'u.ucd_iam_payload'];
    let pgFarmUsers = await client.getInstanceUsers(ctx.instance.instance_id, userColumns);

    let users = resp.rows.filter(row => !row.rolname.match(/^pg_/))
      .map(row => {
        let user = row.rolname;
        let uaccess = access.find(row => row.role_name === user) || {};
        delete uaccess.role_name;
        delete uaccess.database_name;
        uaccess = Object.values(uaccess).filter(v => v);

        let obj = {name: user, pgPrivileges: uaccess};

        let farmUser = pgFarmUsers.find(u => u.username === user);
        if( farmUser ) {
          obj.pgFarmUser = {
            id : farmUser.user_id,
            type : farmUser.type,
            firstName : farmUser.first_name,
            lastName : farmUser.last_name,
            ucdPositions : ucdIamApi.getPositions(farmUser.ucd_iam_payload)
          };
        }

        return obj;
      });

    return users;
  }

  /**
   * @method listSchema
   * @description List all schemas in a database
   *
   * @param {Object|String} ctx context object or id
   * @returns
   */
  async listSchema(ctx) {
    let con = await this.getConnection(ctx);
    let resp = await pgInstClient.listSchema(con);
    return resp.rows.map(row => row.schema_name);
  }

  /**
   * @method getSchemasOverview
   * @description Get an overview of all schemas in a database
   *
   * @param {Object|String} ctx context object or id
   */
  async getSchemasOverview(ctx) {
    let con = await this.getConnection(ctx);
    let resp = await pgInstClient.getSchemasOverview(con);
    return resp.rows.map(row => {
      return {
        name : row.schema_name,
        tableCount : parseInt(row.table_count),
        userCount : parseInt(row.user_count),
        isPublic : row.is_public
      }
    });
  }

  /**
   * @method listTables
   * @description List all tables in a database
   *
   * @param {Object|String} ctx context object or id
   * @param {String} schemaName Schema name to list tables from
   * @returns
   */
  async listTables(ctx, schemaName) {
    let con = await this.getConnection(ctx);
    let resp = await pgInstClient.listTables(con, schemaName);
    return resp.rows;
  }

  /**
   * @method getTableAccessOverview
   * @description Get an overview of all tables in a database
   *
   * @param {String|Object} ctx context object or id
   * @param {String} schemaName Optional.  If not provided, will return all tables
   * @returns
   */
  async getTableAccessOverview(ctx, schemaName) {
    let con = await this.getConnection(ctx);
    let resp = await pgInstClient.getTableAccessOverview(con, ctx.database.name, schemaName);
    return resp.rows.map(row => {
      return {
        schema : row.table_schema,
        tableName : row.table_name,
        tableType : row.table_type,
        userAccess : row.user_access_list ? row.user_access_list.replace(/(^{|}$)/g, '').split(',') : [],
      }
    });
  }

  async getUserAccessOverview(ctx, username) {
    let con = await this.getConnection(ctx);
    let users = await this.getDatabaseUsers(ctx);

    // schema access
    const schemaAccess = await pgInstClient.getSchemaAccess(con);
    const schemas = Array.from( new Set(schemaAccess.rows.map(row => row.schema_name)) );

    // table access
    const allTablesRes = await pgInstClient.query(con, `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    `);

    const tableGrantsRes = await pgInstClient.query(con, `
      SELECT grantee, table_schema, table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE grantee NOT IN ('PUBLIC', 'postgres')
    `);


    for( let user of users ) {
      user.schemas = [];
      user.tableAccessCount = 0;
      for( let schema of schemas ) {
        let access = schemaAccess.rows.find(row => row.role_name === user.name && row.schema_name === schema);
        let schemaOutput = {
          name: schema,
          access : [],
          tableAccess : [],
          tableAccessCount : 0
        };
        if( access ) {
          delete access.role_name;
          delete access.schema_name;
          access = Object.values(access).filter(v => v);
          schemaOutput.access = access;
        }

        for( let table of allTablesRes.rows ) {
          if( table.table_schema === schema ) {
            let tableAccess = tableGrantsRes.rows.filter(row => row.grantee === user.name && row.table_schema === schema && row.table_name === table.table_name);
            if( tableAccess.length ) {
              let access = tableAccess.map(row => row.privilege_type);
              schemaOutput.tableAccess.push({
                name : table.table_name,
                access
              });
              schemaOutput.tableAccessCount++;
              user.tableAccessCount++;
            } else {
              schemaOutput.tableAccess.push({
                name : table.table_name,
                access : []
              });
            }
          }
        }

        user.schemas.push(schemaOutput);
      }
    }


    return users;
  }

  /**
   * @method getTableAccess
   * @description Get the access for a table
   *
   * @param {String|Object} ctx context object or id
   * @param {String} schemaName
   * @param {String} tableName
   * @returns
   */
  async getTableAccess(ctx, schemaName, tableName) {
    let con = await this.getConnection(ctx);
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

  /**
   * @method getTableAccessByUser
   * @description Get the access for a table by user
   *
   * @param {String|Object} ctx context object or id
   * @param {String} schemaName
   * @param {String} username
   * @returns
   */
  async getTableAccessByUser(ctx, schemaName, username) {
    let con = await this.getConnection(ctx);
    let tables = await this.listTables(ctx, schemaName);
    let resp = await pgInstClient.getTableAccessByUser(con, con.database, schemaName, username);

    let tableMap = {};
    for( let row of resp.rows ) {
      if( !tableMap[row.table_name] ) {
        tableMap[row.table_name] = [];
      }
      tableMap[row.table_name].push(row.privilege_type);
    }

    for( let table of tables ) {
      if( !tableMap[table.table_name] ) {
        tableMap[table.table_name] = [];
      }
    }

    resp = await pgInstClient.getSchemaAccess(con, schemaName);
    let schemaAccess = resp.rows.find(row => row.role_name === username);
    if( schemaAccess ) {
      delete schemaAccess.role_name;
      delete schemaAccess.schema_name;
      schemaAccess = Object.values(schemaAccess).filter(v => v);
    } else {
      schemaAccess = []
    }

    return {
      schema : schemaAccess,
      tables : tableMap
    };
  }

}

const database = new Database();
export default database;
