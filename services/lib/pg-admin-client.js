import PG from 'pg';
import crypto from 'crypto';
import config from './config.js';
import logger from './logger.js';
import pgFormat from 'pg-format';

const client = new PG.Pool({
  user : config.adminDb.username,
  host : config.adminDb.host,
  database : config.adminDb.database,
  password : config.adminDb.password,
  port : config.adminDb.port
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
      'instance_state'
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
  async getOrganization(nameOrId) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.ORGANIZATION}
      WHERE organization_id = ${this.schema}.get_organization_id($1)
    `, [nameOrId]);

    if( resp.rows.length === 0 ) {
      throw new Error('Organization not found: '+nameOrId);
    }

    return resp.rows[0];
  }

  /**
   * @method createOrganization
   * @description create a new organization
   * 
   * @param {String} title long name of the organization 
   * @param {Object} opts
   * @param {String} opts.name short name of the organization
   * @param {String} opts.description description of the organization
   * @param {String} opts.url url of the organization
   *  
   * @returns {Promise<Object>}
   */
  async createOrganization(title, opts) {
    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.ORGANIZATION} (title, name, description, url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, opts.name, opts.description, opts.url]);

    return resp.rows[0];
  }

  /**
   * @method updateOrganization
   * @description update organization property
   * 
   * @param {String} nameOrId organization name or ID
   * @param {String} property property to update
   * @param {String} value value to set
   */
  async updateOrganization(nameOrId, property, value) {
    let org = await this.getOrganization(nameOrId);

    if( this.INVALID_UPDATE_PROPS.ORGANIZATION.includes(property) ) {
      throw new Error('Cannot update '+property);
    }

    return client.query(`
      UPDATE ${config.adminDb.tables.ORGANIZATION}
      SET ${pgFormat('%s', property)} = $1
      WHERE organization_id = $2
    `, [value, org.organization_id]);
  }

  /**
   * @method getInstance
   * @description get instance by name or ID
   * 
   * @param {String} nameOrId instance name or ID
   * @param {String} orgNameOrId organization name or ID, can be null
   * @returns 
   */
  async getInstance(nameOrId='', orgNameOrId=null) {
    let res = await client.query(
      `SELECT * FROM ${config.adminDb.tables.INSTANCE} 
       WHERE instance_id = ${this.schema}.get_instance_id($1, $2)`, 
      [nameOrId, orgNameOrId]
    );

    if( res.rows.length === 0 ) {
      throw new Error('Instance not found: '+nameOrId);
    }

    return res.rows[0];
  }

  /**
   * @method createInstance
   * @description create a new instance
   * 
   * @param {String} name Instance name
   * @param {Object} opts  
   * @param {String} opts.hostname hostname of the instance.
   * @param {String} opts.description description of the instance
   * @param {String} opts.port port of the instance
   * @param {String} opts.organization Optional. name or ID of the organization
   * 
   * @returns 
   */
  async createInstance(name, opts) {
    if( opts.organization ) {
      opts.organization = (await this.getOrganization(opts.organization)).organization_id;
    }

    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.INSTANCE}
      (name, hostname, description, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, opts.hostname, opts.description, opts.organization]);

    // TODO: where does node pg report errors?
    if( resp.rows.length === 0 ) {
      logger.error('Instance not created: '+name, resp);
      throw new Error('Instance not created: '+name+'. Please check logs');
    }

    return resp.rows[0];
  }

  /**
   * @method updateInstanceProperty
   * @description update instance property
   * 
   * @param {String} nameOrId instance name or ID
   * @param {String} orgNameOrId organization name or ID
   * @param {String} property property to update
   * @param {String} value value to set
   * @returns {Promise<Object>}
   */
  async updateInstanceProperty(nameOrId, orgNameOrId, property, value) {
    if( this.INVALID_UPDATE_PROPS.INSTANCE.includes(property) ) {
      throw new Error('Cannot update '+property);
    }

    return client.query(`
      UPDATE ${config.adminDb.tables.INSTANCE}
      SET ${pgFormat('%s', property)} = $1
      WHERE instance_id = ${this.schema}.get_instance_id($2, $3)
    `, [value, nameOrId, orgNameOrId]);
  }

  /**
   * @method setInstancek8sConfig
   * @description set k8s config for an instance
   * 
   * @param {String} nameOrId name or ID of the instance
   * @param {String} orgNameOrId name or ID of the organization
   * @param {String} property property to set
   * @param {String} value value to set
   * 
   * @returns {Promise<Object>}
   */
  async setInstancek8sConfig(nameOrId, orgNameOrId, property, value) {
    return client.query(`
      INSERT INTO ${config.adminDb.tables.INSTANCE_CONFIG}
      (instance_id, name, value)
      VALUES (${this.schema}.get_instance_id($1, $2), $3, $4)
      ON CONFLICT (instance_id, name)
      DO UPDATE SET value = EXCLUDED.value
    `, [nameOrId, orgNameOrId, property, value]);
  }

  /**
   * @method getInstanceConfig
   * @description get instance config, all properties
   * 
   * @param {String} nameOrId instance name or ID
   * @param {String} orgNameOrId organization name or ID
   * 
   * @returns {Promise<Object>}
   */
  async getInstanceConfig(nameOrId, orgNameOrId) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.INSTANCE_CONFIG}
      WHERE instance_id = ${this.schema}.get_instance_id($1, $2)
    `, [nameOrId, orgNameOrId]);

    let iconfig = {};
    for( let row of resp.rows ) {
      iconfig[row.name] = row.value;
    }

    return iconfig;
  }

  /**
   * @method getDatabase
   * @description get database by name or ID
   * 
   * @param {String} nameOrId database name or ID
   * @param {String} orgNameOrId organization name or ID
   * 
   * @returns {Promise<Object>}
   */
  async getDatabase(nameOrId, orgNameOrId) {
    let res = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE}
      WHERE database_id = ${this.schema}.get_database_id($1, $2)
    `, [nameOrId, orgNameOrId]);

    if( res.rows.length === 0 ) {
      throw new Error('Database not found: '+nameOrId);
    }

    return res.rows[0];
  }

  /**
   * @method createDatabase
   * @description create a new database
   * 
   * @param {String} title long name of the database
   * @param {Object} opts
   * @param {String} opts.name short name of the database
   * @param {String} opts.instance name or ID of the instance
   * @param {String} opts.organization name or ID of the organization
   * @param {String} opts.short_description short description of the database
   * @param {String} opts.description description of the database, can include markdown
   * @param {String} opts.tags tags for the database
   * 
   * @returns {Promise<Object>}
   **/
  async createDatabase(title, opts) {
    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.DATABASE}
      (title, name, instance_id, organization_id, short_description, description, tags, url)
      VALUES ($1, $2, ${this.schema}.get_instance_id($3, $4), ${this.schema}.get_organization_id($4), $5, $6, $7, $8)
      RETURNING *
    `, [title, opts.name, opts.instance, opts.organization, 
        opts.short_description, opts.description, opts.tags, opts.url]);

    return resp.rows[0];
  }

  /**
   * @method updateDatabaseProperty
   * @description update database property
   * 
   * @param {String} nameOrId database name or ID
   * @param {String} orgNameOrId organization name or ID
   * @param {String} property property to update
   * @param {String} value value to set
   * @returns {Promise<Object>}
   */
  updateDatabaseProperty(nameOrId, orgNameOrId, property, value) {
    if( this.INVALID_UPDATE_PROPS.DATABASE.includes(property) ) {
      throw new Error('Cannot update '+property);
    }

    return client.query(`
      UPDATE ${config.adminDb.tables.DATABASE}
      SET ${pgFormat('%s', property)} = $1
      WHERE database_id = ${this.schema}.get_database_id($2, $3)
    `, [value, nameOrId, orgNameOrId]);
  }

  /**
   * @method createInstanceUser
   * @description create a new database instance user
   * 
   * @param {String} instNameOrId instance name or ID
   * @param {String} orgNameOrId organization name or ID
   * @param {String} username username of the user.  will be added to the pgfarm.users table if not exists
   * @param {String} password password for this user on this instance
   * @param {String} type pgfarm user type (instance_user_type enum)
   * @returns {Promise<Object>}
   */
  async createInstanceUser(instNameOrId, orgNameOrId, username, password, type) {
    return client.query(`SELECT * FROM ${this.schema}.create_instance_user($1, $2, $3, $4)`, 
    [instNameOrId, orgNameOrId, username, password, type]);
  }

  /**
   * @method getInstanceUser
   * @description get instance user by name or ID.  Note this is for looking up
   * a user by database instance name, not database name.  See getInstanceUserForDb()
   * for that more common use case.
   * 
   * @param {String} instNameOrId instance name or ID
   * @param {String} orgNameOrId organization name or ID
   * @param {String} username 
   * @returns {Promise<Object>}
   */
  async getInstanceUser(instNameOrId, orgNameOrId, username) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.INSTANCE_DATABASE_USERS}
      WHERE instance_user_id = ${this.schema}.get_instance_user($1, $2, $3)
    `, [instNameOrId, orgNameOrId, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    }

    return resp.rows[0];
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

  async getInstances(opts={}) {

    let type = '';
    if( opts.username ) {
      type = `, type`;
    }

    let SELECT = `SELECT database_name, instance_id${type} FROM ${config.adminDb.views.INSTANCE_DATABSE_USERS}`;
    let args = [];

    if( opts.username ) {
      SELECT += ` WHERE username = $1`;
      args.push(opts.username);
    }

    SELECT += ` GROUP BY database_name, instance_id${type} ORDER BY database_name`;

    let resp = await client.query(SELECT, args);

    return resp.rows.map(row => {
      let v = {
        name : row.database_name,
        id : row.instance_id
      }
      if( opts.username ) {
        v.role = row.type;
      }
      return v;
    });
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
    const hash = 'urn:md5:'+crypto.createHash('md5').update(token).digest('base64');
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
   * @description get the full JWT token from the md5 hash of the token
   * 
   * @param {String} hash md5 hash of the
   * @returns {Promise<String>}
   */
  async getUserTokenFromHash(hash) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.USER_TOKEN}
      WHERE hash = $1
    `, [hash]);

    if( resp.rows.length === 0 ) {
      return '';
    }

    return resp.rows[0].token;
  }


}

const instance = new PgFarmAdminClient();
export default instance;