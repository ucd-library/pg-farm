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

class PgFarmAdminClient {

  constructor() {
    this.client = client;

    this.getEnumTypes();

    this.schema = config.adminDb.schema;

    this.enums = [
      'instance_user_type'
    ]
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

  async getOrganization(nameOrId) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.ORGANIZATION}
      WHERE name = $1 OR organization_id=try_cast_uuid($1)
    `, [nameOrId]);

    if( resp.rows.length === 0 ) {
      throw new Error('Organization not found: '+nameOrId);
    }

    return resp.rows[0];
  }

  async getInstance(nameOrId='', orgNameOrId=null) {
    let res = await client.query(
      `SELECT * FROM ${config.adminDb.tables.INSTANCE} 
       WHERE instance_id = ${this.schema}.get_instance($1, $2)`, 
      nameOrId, orgNameOrId
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
    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.INSTANCE}
      (name, hostname, description, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, opts.hostname, opts.description, opts.organization_id]);

    // TODO: where does node pg report errors?
    if( resp.rows.length === 0 ) {
      logger.error('Instance not created: '+name, resp);
      throw new Error('Instance not created: '+name+'. Please check logs');
    }

    return resp.rows[0];
  }

  async updateInstance(nameOrId, instanceId, property, value) {
    let instance = await this.getInstance(nameOrId);

    let resp = await client.query(`
      UPDATE ${config.adminDb.tables.INSTANCE}
      SET ${pgFormat('%s', property)} = $1
      WHERE instance_id = $2
    `, [value, instance.instance_id]);
  }

  async setInstanceConfig(nameOrId, name, value) {
    let instance = await this.getInstance(nameOrId);

    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.INSTANCE_CONFIG}
      (instance_id, name, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (instance_id, name)
      DO UPDATE SET value = EXCLUDED.value
    `, [instance.instance_id, name, value]);
  }

  async getInstanceConfig(nameOrId) {
    let instance = await this.getInstance(nameOrId);

    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.tables.INSTANCE_CONFIG}
      WHERE instance_id = $1
    `, [instance.instance_id]);

    let iconfig = {};
    for( let row of resp.rows ) {
      iconfig[row.name] = row.value;
    }

    return iconfig;
  }

  /**
   * @method createOrganization
   * @description create a new organization
   * 
   * @param {String} name name of the organization 
   * @param {Object} opts
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

  async getDatabase(nameOrId, orgNameOrId) {
    let res = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE}
      WHERE database_id = ${this.schema}.get_database($1, $2)
    `, [nameOrId, orgNameOrId]);

    if( res.rows.length === 0 ) {
      throw new Error('Database not found: '+nameOrId);
    }

    return res.rows[0];
  }

  async createDatabase(title, opts) {
    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.DATABASE}
      (title, name, instance_id, organization_id, short_description, description, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, opts.name, opts.instance_id, opts.organization_id, 
        opts.short_description, opts.description, opts.tags]);

    return resp.rows[0];
  }

  async createInstanceUser(instNameOrId, orgNameOrId, username, password, type) {
    return client.query(`SELECT * FROM ${this.schema}.create_instance_user($1, $2, $3, $4)`, 
    [instNameOrId, orgNameOrId, username, password, type]);
  }

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

  async setUserToken(token) {
    const hash = 'urn:md5:'+crypto.createHash('md5').update(token).digest('base64');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const expires = new Date(payload.exp * 1000);
    const username = payload.username || payload.preferred_username;

    await client.query(`
      SELECT * from ${this.schema}.add_user_token($1, $2, $3)
    `, [username, token, hash, expires.toISOString()]);

    return hash;
  }

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