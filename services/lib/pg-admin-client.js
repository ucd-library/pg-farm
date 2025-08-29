import PG from 'pg';
import crypto from 'crypto';
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';
import { getContext } from './context.js';
import pgFormat from 'pg-format';

const client = new PG.Pool({
  user : config.adminDb.username,
  host : config.adminDb.host,
  database : config.adminDb.database,
  password : config.adminDb.password,
  port : config.adminDb.port,
  options : '--search_path=public,pgfarm'
});
client.on('error', (err) => {
  logger.error('PG admin db client error', err);
});

class PgFarmAdminClient {

  constructor() {
    this.client = client;

    this.getEnumTypes();

    this.schema = config.adminDb.schema;

    this.enums = [
      'instance_user_type',
      'instance_availability',
      'instance_state',
      'database_event_type'
    ]

    this.INVALID_UPDATE_PROPS = {
      ORGANIZATION : ['organization_id', 'updated_at', 'created_at'],
      INSTANCE : ['instance_id', 'updated_at', 'created_at', 'organization_id'],
      DATABASE : ['database_id', 'updated_at', 'created_at', 'organization_id']
    }

  }

  query(query, args) {
    return client.query(query, args);
  }

  /**
   * @method getEnumTypes
   * @description need to set parser for custom enum types
   */
  async getEnumTypes() {
    await utils.waitUntil(config.adminDb.host, config.adminDb.port);
    let resp = await client.query('SELECT typname, oid, typarray FROM pg_type WHERE typname = \'text\'');
    let text = resp.rows[0];

    for( let type of this.enums ) {
      resp = await client.query('SELECT typname, oid, typarray FROM pg_type WHERE typname = $1', [type]);
      let eum = resp.rows[0];

      if( !eum ) {
        logger.warn('Unable to discover enum types, retrying in 2 sec');
        setTimeout(() => this.getEnumTypes(), 2000);
        return;
      }

      PG.types.setTypeParser(eum.typarray, PG.types.getTypeParser(text.typarray));
    }
  }

  /**
   * @method getOrganization
   * @description get organization by name or ID
   *
   * @param {String} nameOrId organization name or ID
   * @returns {Promise<Object>}
   */
  async getOrganization(nameOrId, columns='*') {
    if ( Array.isArray(columns) ) {
      columns = columns.join(', ');
    }

    let resp = await client.query(`
      SELECT ${columns} FROM ${config.adminDb.views.ORGANIZATION_DATABASE_COUNT}
      WHERE organization_id = ${this.schema}.get_organization_id($1)
    `, [nameOrId]);

    if( resp.rows.length === 0 ) {
      throw new Error('Organization not found: '+nameOrId);
    }

    return resp.rows[0];
  }

  /**
   * @method isOrganizationAdmin
   * @description check if a user is an admin for an organization
   *
   * @param {String} username
   * @param {String} orgName
   * @returns {Promise<Boolean>}
   */
  async isOrganizationAdmin(username, orgName) {
    let resp = await client.query(`
      SELECT * FROM ${this.schema}.is_org_admin($1, $2)
    `, [username, orgName]);

    return resp.rows[0].is_org_admin;
  }

  /**
   * @method getOrganizationUsers
   * @description get all users for an organization
   *
   * @param {String} nameOrId organization name or ID
   * @returns {Promise<Array>}
   **/
  async getOrganizationUsers(nameOrId) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.ORGANIZATION_USER}
      WHERE organization_id = ${this.schema}.get_organization_id($1)
    `, [nameOrId]);

    return resp.rows;
  }

  /**
   * @method getOrganizationUser
   * @description get a user for an organization
   *
   * @param {String} nameOrId organization name or ID
   * @returns {Promise<Array>}
   **/
  async getOrganizationUser(username, nameOrId) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.ORGANIZATION_USER}
      WHERE organization_id = ${this.schema}.get_organization_id($1) AND
            username = $2
    `, [nameOrId, username]);

    return resp.rows;
  }

  /**
   * @method createOrganization
   * @description create a new organization
   *
   * @param {Object} org
   * @param {String} org.title long name of the organization
   * @param {String} org.name short name of the organization
   * @param {String} org.description description of the organization
   * @param {String} org.url url of the organization
   *
   * @returns {Promise<Object>}
   */
  async createOrganization(org) {
    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.ORGANIZATION} (title, name, description, url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [org.title, org.name, org.description, org.url]);

    return resp.rows[0];
  }

  /**
   * @method getInstance
   * @description get instance by name or ID
   *
   * @param {String} ctx context object or id
   * @param {Boolean} useView default false.  If true, use the view instead of the table
   * @returns
   */
  async getInstance(ctx, useView=false) {
    ctx = getContext(ctx);

    let table = useView ? config.adminDb.views.INSTANCE : config.adminDb.tables.INSTANCE;

    let res = await client.query(
      `SELECT * FROM ${table}
       WHERE instance_id = ${this.schema}.get_instance_id($1, $2)`,
      [ctx?.instance?.name, ctx?.organization?.name]
    );

    if( res.rows.length === 0 ) {
      throw new Error('Instance not found: '+ctx?.instance?.name+' for org: '+ctx?.organization?.name);
    }

    return res.rows[0];
  }

  /**
   * @method getInstanceByHostname
   * @description get instance by hostname
   *
   * @param {String} hostname
   *
   * @returns {Promise<Object>}
   **/
  async getInstanceByHostname(hostname) {
    let res = await client.query(
      `SELECT * FROM ${config.adminDb.tables.INSTANCE} WHERE hostname = $1`,
      [hostname]
    );

    if( res.rows.length === 0 ) {
      throw new Error('Instance hostname not found: '+hostname);
    }

    return res.rows[0];
  }

  /**
   * @method getInstances
   * @description get all instances
   *
   * @returns {Promise<Array>}
   */
  async getInstances(opts={}) {
    if( !opts.limit ) opts.limit = 10;
    if( !opts.offset ) opts.offset = 0;

    let where = [], params = [], paging='';
    if( opts.state ) {
      params.push(opts.state);
      where.push(`state = $${params.length}`);
    }
    if( opts.organization ) {
      params.push(opts.organization);
      where.push(`organization_id = ${this.schema}.get_organization_id($${params.length})`);
    }

    params.push(opts.limit);
    paging = `LIMIT $${params.length}`;

    params.push(opts.offset);
    paging += ` OFFSET $${params.length}`;

    where = where.length > 0 ? 'WHERE '+where.join(' AND ') : '';

    let res = await client.query(
      `SELECT * FROM ${config.adminDb.views.INSTANCE} ${where} ORDER BY name ASC ${paging} `,
      params
    );
    return res.rows;
  }

  async getLastDatabaseEvent(instId) {
    let res = await client.query(`
      SELECT * FROM ${config.adminDb.views.DATABASE_EVENT}
      WHERE instance_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [instId]);

    if( res.rows.length === 0 ) {
      return null;
    }

    return res.rows[0];
  }

  async updateInstancePriority(ctx, priority) {
    return client.query(`
      UPDATE ${config.adminDb.tables.INSTANCE}
      SET priority_state = $1
      WHERE instance_id = ${this.schema}.get_instance_id($2, $3)
    `, [priority, ctx.instance.name, ctx.organization.name]);
  }

  /**
   * @method getInstanceDatabases
   * @description get all databases for an instance
   *
   * @param {Object|String} ctx context object or id
   * @returns
   */
  async getInstanceDatabases(ctx) {
    ctx = getContext(ctx);

    let res = await client.query(
      `select * from ${config.adminDb.tables.DATABASE} where instance_id = $1;`,
      [ctx.instance.instance_id]
    );

    return res.rows;
  }

  /**
   * @method createInstance
   * @description create a new instance
   *
   * @param {String} inst 
   * @param {Object} inst.name Instance name
   * @param {String} inst.hostname hostname of the instance.
   * @param {String} inst.description description of the instance
   * @param {String} inst.port port of the instance
   * @param {String} inst.organization Optional. name or ID of the organization
   *
   * @returns
   */
  async createInstance(inst) {
    if( inst.organization ) {
      let orgName = (typeof inst.organization === 'string') ? inst.organization : inst.organization.name;
      inst.organization = (await this.getOrganization(orgName)).organization_id;
    }

    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.INSTANCE}
      (name, hostname, description, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [inst.name, inst.hostname, inst.description, inst.organization]);

    // TODO: where does node pg report errors?
    if( resp.rows.length === 0 ) {
      logger.error('Instance not created: '+inst.name, resp);
      throw new Error('Instance not created: '+inst.name+'. Please check logs');
    }

    return resp.rows[0];
  }

  /**
   * @method updateInstanceProperty
   * @description update instance property
   *
   * @param {String|Object} ctx context object or id
   * @param {String} property property to update
   * @param {String} value value to set
   * @returns {Promise<Object>}
   */
  async updateInstanceProperty(ctx, property, value) {
    if( this.INVALID_UPDATE_PROPS.INSTANCE.includes(property) ) {
      throw new Error('Cannot update '+property);
    }

    return client.query(`
      UPDATE ${config.adminDb.tables.INSTANCE}
      SET ${pgFormat('%s', property)} = $1
      WHERE instance_id = ${this.schema}.get_instance_id($2, $3)
    `, [value, ctx.instance.name, ctx.organization.name]);
  }

  /**
   * @method setInstancek8sConfig
   * @description set k8s config for an instance
   *
   * @param {String|Object} ctx context object or id
   * @param {String} property property to set
   * @param {String} value value to set
   *
   * @returns {Promise<Object>}
   */
  async setInstanceConfig(ctx, property, value) {
    return client.query(`
      INSERT INTO ${config.adminDb.tables.INSTANCE_CONFIG}
      (instance_id, name, value)
      VALUES (${this.schema}.get_instance_id($1, $2), $3, $4)
      ON CONFLICT (instance_id, name)
      DO UPDATE SET value = EXCLUDED.value
    `, [ctx.instance.name, ctx.organization.name, property, value]);
  }

  /**
   * @method getInstanceConfig
   * @description get instance config, all properties
   *
   * @param {String|Object} ctx context object or id
   *
   * @returns {Promise<Object>}
   */
  async getInstanceConfig(ctx) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.INSTANCE_CONFIG}
      WHERE instance_id = ${this.schema}.get_instance_id($1, $2)
    `, [ctx.instance.name, ctx.organization.name]);

    let iconfig = {};
    for( let row of resp.rows ) {
      iconfig[row.name] = row.value;
    }

    return iconfig;
  }

  async getFeaturedDatabases(orgNameOrId){
    const values = [];
    let sql = `SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE_FEATURED}`;
    if( orgNameOrId ) {
      sql += ` WHERE featured_organization_id = ${this.schema}.get_organization_id($1)`;
      values.push(orgNameOrId);
    } else {
      sql += ` WHERE featured_organization_id IS NULL`;
    }
    sql += ' ORDER BY order_index ASC';
    let resp = await client.query(sql, values);
    return resp.rows;
  }

  /**
   * @description add a database to the featured list for an organization or globally
   * @param {String} nameOrId - database name or ID
   * @param {String} orgNameOrId - organization name or ID
   * @param {Object} opts - options
   * @param {Number} opts.orderIndex - order index for the database in the featured list
   * @param {Boolean} opts.organizationList - if true, database will be featured for the organization. Otherwise, it will be featured globally
   * @returns {Promise<Object>}
   */
  async addFeaturedDatabase(nameOrId, orgNameOrId, opts) {
    const orderIndex = opts?.orderIndex || 0;
    const values = [nameOrId, orgNameOrId, orderIndex];
    let sql = `
      INSERT INTO ${config.adminDb.tables.DATABASE_FEATURED}
      (database_id, order_index, organization_id)
      VALUES (${this.schema}.get_database_id($1, $2), $3, ${opts?.organizationList ? `${this.schema}.get_organization_id($2)` : 'NULL'})
    `;
    return client.query(sql, values);
  }

  /**
   * @description Update the order index of a featured database.
   * @param {String} featuredId - database featured ID
   * @param {Number} orderIndex - new order index
   * @returns {Promise<Object>}
   */
  async setFeaturedDatabaseOrder(featuredId, orderIndex) {
    return client.query(`
      UPDATE ${config.adminDb.tables.DATABASE_FEATURED}
      SET order_index = $1
      WHERE database_featured_id = $2
    `, [orderIndex, featuredId]);
  }

  /**
   * @description Remove a database from the featured list
   * @param {String} featuredId - database featured ID
   * @returns
   */
  async removeFeaturedDatabase(featuredId) {
    return client.query(`
      DELETE FROM ${config.adminDb.tables.DATABASE_FEATURED}
      WHERE database_featured_id = $1
    `, [featuredId]);
  }

  /**
   * @method getDatabase
   * @description get database by name or ID
   *
   * @param {String} ctx  context object or id
   * @param {String} columns optional.  columns to return
   *
   * @returns {Promise<Object>}
   */
  async getDatabase(ctx, columns=null) {
    ctx = getContext(ctx);

    if( !columns ) {
      columns = ["instance_id","database_id", "organization_id", 
        "name","title","short_description",
        "description","url","tags","brand_color", "created_at", "updated_at",
        "pgrest_hostname","discoverable"
      ];
    }

    let res = await client.query(`
      SELECT * FROM ${config.adminDb.tables.DATABASE}
      WHERE database_id = ${this.schema}.get_database_id($1, $2)
    `, [ctx.database.name, ctx.organization.name]);

    if( res.rows.length === 0 ) {
      throw new Error('Database not found: '+ctx.fullDatabaseName);
    }

    return res.rows[0];
  }

  /**
   * @method createDatabase
   * @description create a new database
   *
   * @param {Object} opts
   * @param {String} opts.title long name of the database
   * @param {String} opts.name short name of the database
   * @param {String} opts.instance name or ID of the instance
   * @param {String} opts.organization name or ID of the organization
   * @param {String} opts.short_description short description of the database
   * @param {String} opts.description description of the database, can include markdown
   * @param {String} opts.tags tags for the database
   *
   * @returns {Promise<Object>}
   **/
  async createDatabase(opts) {
    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.DATABASE}
      (title, name, instance_id, organization_id, pgrest_hostname, short_description, description, tags, url)
      VALUES ($1, $2, ${this.schema}.get_instance_id($3, $4), ${this.schema}.get_organization_id($4), $5, $6, $7, $8, $9)
      RETURNING *
    `, [opts.title, opts.name, opts.instance, opts.organization, opts.pgrest_hostname,
        opts.short_description, opts.description, opts.tags, opts.url]);

    return resp.rows[0];
  }

  /**
   * @method setDatabaseMetadata
   * @description update database metadata properties
   *
   * @param {String} dbId database ID
   * @param {Object} metadata properties to update
   *
   * @returns {Promise<Object>}
   */
  setDatabaseMetadata(dbId, metadata) {
    let keys = [];
    let values = [];
    let templateParams = [];
    for( let key in metadata ) {
      let columnName = key;
      if( key === 'shortDescription' ) {
        columnName = 'short_description';
      } else if( key === 'brandColor' ) {
        columnName = 'brand_color';
      }
      keys.push(columnName);
      values.push(metadata[key]);
      templateParams.push('$'+values.length);
    }
    values.push(dbId);

    let setClause;
    if ( keys.length === 1 ) {
      setClause = `${keys[0]} = $1`;
    } else {
      setClause = `(${keys.join(', ')}) = (${templateParams.join(', ')})`;
    }

    return client.query(`
      UPDATE ${config.adminDb.tables.DATABASE}
      SET ${setClause}
      WHERE database_id = $${templateParams.length+1}
    `, values);
  }

  /**
   * @method updateOrganization
   * @description update organization metadata properties
   *
   * @param {String} orgId organization ID
   * @param {Object} metadata properties to update
   * @param {String} metadata.title optional.  The human title of the organization
   * @param {String} metadata.description optional.  A description of the organization.  Markdown is supported.
   * @param {String} metadata.url optional.  A website for more information about the organization
   *
   * @returns {Promise<Object>}
   */
  updateOrganization(orgId, metadata) {
    let keys = [];
    let values = [];
    let templateParams = [];
    for( let key in metadata ) {
      keys.push(key);
      values.push(metadata[key]);
      templateParams.push('$'+values.length);
    }
    values.push(orgId);

    let setClause;
    if ( keys.length === 1 ) {
      setClause = `${keys[0]} = $1`;
    } else {
      setClause = `(${keys.join(', ')}) = (${templateParams.join(', ')})`;
    }

    return client.query(`
      UPDATE ${config.adminDb.tables.ORGANIZATION}
      SET ${setClause}
      WHERE organization_id = $${templateParams.length+1}
    `, values);
  }

  setOrganizationRole(orgNameOrId, username, role) {
    return client.query(`
      SELECT * FROM ${this.schema}.add_organization_role($1, $2, $3)
    `, [orgNameOrId, username, role]);
  }

  /**
   * @method createInstanceUser
   * @description create a new database instance user
   *
   * @param {String|Object} ctx context object or id
   * @param {Object} user
   * @param {String} user.username username of the user.  will be added to the pgfarm.users table if not exists
   * @param {String} user.password password for this user on this instance
   * @param {String} user.type pgfarm user type (instance_user_type enum)
   * @param {String} user.parent optional.  parent user to create this user under
   * @returns {Promise<Object>}
   */
  async createInstanceUser(ctx, user) {
    ctx = getContext(ctx);

    return client.query(`SELECT * FROM ${this.schema}.add_instance_user($1, $2, $3, $4, $5, $6)`,
    [ctx.instance.name, ctx.organization.name, user.username, user.password, user.type, user.parent]);
  }

  /**
   * @method deleteInstanceUser
   * @description delete a user from an instance
   *
   * @param {Object|String} ctx context object or id
   * @param {String} username
   * @returns
   */
  async deleteInstanceUser(ctx, username) {
    ctx = getContext(ctx);

    return client.query(`
      DELETE FROM
        ${this.schema}.instance_user
      WHERE
        instance_user_id = (SELECT * FROM ${this.schema}.get_instance_user_id($1, $2, $3))`,
    [username, ctx.instance.name, ctx.organization.name]);
  }

  /**
   * @method getInstanceUser
   * @description get instance user by instance name/id or database name/id.
   *
   * @param {String|Object} ctx context object or id
   * @param {String} username
   * @returns {Promise<Object>}
   */
  async getInstanceUser(ctx, username) {
    // let resp = await client.query(`
    //   SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE_USERS}
    //   WHERE instance_user_id = ${this.schema}.get_instance_user($1, $2, $3)
    // `, [instNameOrId, orgNameOrId, username]);

    // if( resp.rows.length === 0 ) {
    //   throw new Error('User not found: '+username);
    // }

    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE_USERS}
      WHERE
        (organization_name = $2 OR organization_id=try_cast_uuid($2)) AND
        (
          instance_name = $1 OR instance_id=try_cast_uuid($1)
        ) AND
        username = $3
    `, [ctx.instance.name, ctx.organization.name, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    }

    return resp.rows[0];
  }

  /**
   * @method getInstanceUsers
   * @description get all users for instance.
   *
   * @param {String} instId instance id
   *
   * @returns {Promise<Object>}
   */
  async getInstanceUsers(instId, columns='*') {
    if( typeof columns === 'string' ) {
      columns = columns.split(',');
    }
    let resp = await client.query(`
      select ${columns.join(', ')} from pgfarm.instance_user iu
      left join pgfarm.user u on iu.user_id = u.user_id
      where iu.instance_id = $1;
    `, [instId]);

    return resp.rows;
  }

  /**
   * @method getInstanceUserForDb
   * @description get instance user given a specific database and organization
   *
   * @param {String} dbNameOrId database name or ID
   * @param {String} orgNameOrId organization name or ID
   * @param {String} username
   * @returns {Promise<Object>}
   */
  async getInstanceUserForDb(dbNameOrId, orgNameOrId, username) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE_USERS}
      WHERE instance_user_id = ${this.schema}.get_instance_user_id_for_db($1, $2, $3)
    `, [dbNameOrId, orgNameOrId, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    }

    return resp.rows[0];
  }

  async setInstanceUserPassword(ctx, username, password) {
    // update database
    await client.query(
      `UPDATE ${config.adminDb.tables.INSTANCE_USER}
      SET password = $4
      WHERE instance_user_id = ${this.schema}.get_instance_user_id($1, $2, $3)`,
      [username, ctx.instance.name, ctx.organization.name, password]
    );
  }

  async getDatabases(opts={}) {
    let username = opts.username || config.pgInstance.publicRole.username;
    const params = [username];

    if ( opts.organization ) {
      params.push(opts.organization);
    }

    let resp = await client.query(
      `SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE_USERS}
        WHERE username = $1
        ${opts.organization ? `AND organization_id = ${this.schema}.get_organization_id($2)` : ''}
        `,
        params
    );

    return resp.rows;
  }

  /**
   * @method setUserToken
   * @description set a user auth token in the database.  The JWT token should be trusted as this
   * method does not verify the token.  It will parse the body and store the expires time as well
   * as username and token hash.  The token hash is the md5 hash of the token.  It's shorter and
   * can be used in place of the full JWT token.  Returns the md5 hash token.
   *
   * @param {String} token JWT token to store
   * @returns {Promise<String>}
   */
  async setUserToken(token) {
    const hash = crypto.createHash('md5').update(token).digest('base64');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const expires = new Date(payload.exp * 1000);
    const username = payload.username || payload.preferred_username;

    await client.query(`
      SELECT * from ${this.schema}.add_user_token($1, $2, $3, $4)
    `, [username, token, hash, expires.toISOString()]);

    return hash;
  }

  /**
   * @method getUserTokenFromHash
   * @description get the full JWT token from the md5 hash of the token, also checks the
   * jwt token exists
   *
   * @param {String} token md5 hash of the token or the token itself
   * @returns {Promise<String>}
   */
  async getUserTokenFromHash(hash) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.USER_TOKEN}
      WHERE hash = $1 OR token = $1
    `, [hash]);

    if( resp.rows.length === 0 ) {
      return '';
    }

    return resp.rows[0].token;
  }

  async purgeExpiredTokens() {
    return client.query(`Select * from ${this.schema}.purge_old_user_tokens()`);
  }

  /**
   * @method updateDatabaseLastEvent
   * @description update the last event for a database, example
   * last time a user queried the database
   *
   * @param {String} dbId uuid of the database
   * @param {String} event database_event_type
   * @returns {Promise<Object>}
   */
  updateDatabaseLastEvent(dbId, event) {
    return client.query(`
      SELECT * FROM ${this.schema}.update_database_last_event($1::UUID, $2::database_event_type)
    `, [dbId, event]);
  }

  /**
   * @method onConnectionOpen
   * @description record a connection open event
   *
   * @param {Object} args
   * @param {String} args.sessionId session ID of the connection
   * @param {String} args.databaseName database name
   * @param {String} args.orgName organization name
   * @param {String} args.userName pgfarm username
   * @param {String} args.remoteAddress ip address of the client
   * @param {Object} args.data additional connection data
   * @param {String} args.timestamp time of the connection
   *
   * @returns
   */
  onConnectionOpen(args={}) {
    return client.query(`
        SELECT * FROM ${this.schema}.connection_open($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [args.sessionId, args.databaseName, args.orgName, args.userName,
        args.remoteAddress, args.data, args.gatewayId, args.timestamp]
    );
  }

  logProxyConnectionEvent(sessionId, type, message) {
    return client.query(`
      SELECT * FROM ${this.schema}.add_connection_event($1, $2, $3)
    `,
      [sessionId, type, message]
    );
  }

  /**
   * @method onConnectionClose
   * @description record a connection close event
   *
   * @param {String} sessionId session ID of the connection
   * @param {String} timestamp time of the connection
   *
   * @returns Promise<Object>
   */
  onConnectionClose(sessionId, timestamp) {
    return client.query(`
      SELECT * FROM ${this.schema}.connection_close($1, $2)
    `,
    [sessionId, timestamp]);
  }

  updateConnectionAlive(sessionId) {
    return client.query(`
      SELECT * FROM ${this.schema}.update_connection_alive_timestamp($1)
    `, [sessionId]);
  }

  getConnectionLog(sessionId) {
    return client.query(`
      SELECT * FROM ${this.schema}.connection_event
      WHERE session_id = $1
      ORDER BY timestamp DESC
    `, [sessionId]);
  }

  getConnections(query={}) {
    let params = [];
    let where = [];

    if( query.database ) {
      let org = null;
      let db = query.database;
      if( query.database.indexOf('/') > -1 ) {
        let parts = query.database.split('/');
        org = parts[0];
        db = parts[1];
      }

      where.push(`database_name = get_database_id($${params.length+1}, $${params.length+2})`);
      params.push(db);
      params.push(org);
    }

    if( query.username ) {
      where.push(`user_id = get_user_id($${params.length+1})`);
      params.push(query.username);
    }

    if( query.active === true ) {
      where.push('closed_at IS NULL');
      where.push('alive_at > NOW() - INTERVAL \'10 minutes\'');
    } else {
      where.push('closed_at IS NULL');
    }

    return client.query(
      `SELECT * FROM ${this.schema}.connection_view c
        ${where.length > 0 ? 'WHERE '+where.join(' AND ') : ''}
      `,
      params
    );
  }

}

const instance = new PgFarmAdminClient();
export default instance;
