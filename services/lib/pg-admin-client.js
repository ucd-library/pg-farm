import PG from 'pg';
import crypto from 'crypto';
import config from './config.js';
import logger from './logger.js';


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

  async getInstance(nameOrId) {
    let res = await client.query(`
      SELECT * FROM ${config.adminDb.tables.INSTANCE}
      WHERE name = $1 OR instance_id=try_cast_uuid($1)
    `, [nameOrId]);

    if( res.rows.length === 0 ) {
      throw new Error('Instance not found: '+nameOrId);
    }

    return res.rows[0];
  }

  async createInstance(name, hostname, description, port) {
    let resp = await client.query(`
      INSERT INTO ${config.adminDb.tables.INSTANCE}
      (name, hostname, description, port)
      VALUES ($1, $2, $3, $4)
      RETURNING instance_id
    `, [name, hostname, description, port]);

    if( resp.rows.length === 0 ) {
      logger.error('Instance not created: '+name, resp);
      throw new Error('Instance not created: '+name);
    }

    return resp.rows[0].instance_id;
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

    let config = {};
    for( let row of resp.rows ) {
      config[row.name] = row.value;
    }

    return config;
  }

  async createUser(nameOrId, username, password, type) {
    let instance = await this.getInstance(nameOrId);

    return client.query(`
      INSERT INTO ${config.adminDb.tables.DATABASE_USERS}
      (username, password, type, instance_id)
      VALUES ($1, $2, $3, $4)
    `, [username, password, type, instance.instance_id]);
  }

  async getUser(instNameOrId, username) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_USERS}
      WHERE (database_name = $1 OR instance_id=try_cast_uuid($1)) AND username = $2
    `, [instNameOrId, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    }

    return resp.rows[0];
  }

  async userExists(instNameOrId, username) {
    try {
      await this.getUser(instNameOrId, username);
      return true;
    } catch(e) {
      return false;
    }
  }

  async getInstances(opts={}) {

    let type = '';
    if( opts.username ) {
      type = `, type`;
    }

    let SELECT = `SELECT database_name, instance_id${type} FROM ${config.adminDb.views.INSTANCE_USERS}`;
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

  async getInstanceUsers(instNameOrId) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_USERS}
      WHERE database_name = $1 OR instance_id=try_cast_uuid($1)
    `, [instNameOrId]);

    return resp.rows;
  }

  async setUserToken(token) {
    const hash = 'urn:md5:'+crypto.createHash('md5').update(token).digest('base64');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const expires = new Date(payload.exp * 1000);

    await client.query(`
      INSERT INTO ${config.adminDb.tables.USER_TOKEN}
      (token, hash, expires) VALUES ($1, $2, $3)
    `, [token, hash, expires.toISOString()]);

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