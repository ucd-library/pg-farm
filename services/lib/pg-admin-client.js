import PG from 'pg';
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

  async getInstanceUsers(instNameOrId) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_USERS}
      WHERE database_name = $1 OR instance_id=try_cast_uuid($1)
    `, [instNameOrId]);

    return resp.rows;
  }

}

const instance = new PgFarmAdminClient();
export default instance;