import PG from 'pg';
import config from '../administration/src/config.js';


const client = new PG.Pool({
  user : config.pg.username,
  host : config.pg.host,
  database : config.pg.database,
  password : config.pg.password,
  port : config.pg.port
});

class PgFarmAdminClient {

  constructor() {
    this.client = client;
  }

  getInstance(nameOrId) {
    let res = client.query(`
      SELECT * FROM ${config.pg.tables.INSTANCE()}
      WHERE name = $1 OR instance_id = $1
    `, [nameOrId]);

    if( res.rows.length === 0 ) {
      throw new Error('Instance not found: '+nameOrId);
    }

    return res.rows[0];
  }

  async addInstance(name, hostname, description, port) {
    let resp = await client.query(`
      INSERT INTO ${config.pg.tables.INSTANCE()}
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

  async addUser(nameOrId, username, password) {
    let instance = await this.getInstance(nameOrId);

    return client.query(`
      INSERT INTO ${config.pg.tables.DATABASE_USERS()}
      (username, password, type, instance_id)
      VALUES ($1, $2, 'USER', $3)
    `, [username, password, instance.instance_id]);
  }

  async getUser(instNameOrId, username) {
    let resp = await client.query(`
      SELECT * FROM ${config.pg.views.INSTANCE_USERS()}
      WHERE (instance_id = $1 OR database_name = $1) AND username = $2
    `, [instNameOrId, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    }

    return resp.rows[0];
  }

}

const instance = new PgFarmAdminClient();
export default instance;