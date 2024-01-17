import utils from  '../lib/utils.js'
import pgInstClient from '../lib/pg-client.js';
import client from '../lib/pg-admin-client.js';
import config from '../config.js';


class PgInstance {

  async getConnection(id) {
    let res = await client.query(`
    SELECT * FROM ${config.pg.views.INSTANCE_USERS()}
    WHERE 
      (instance_database_id = $1 OR database_name = $1)
      AND username = 'postgres'
    `, [id]);

    if( res.rows.length > 0 ) {
      let instance = res.rows[0];
      return {
        id : instance.instance_database_id,
        host : instance.hostname,
        port : instance.port,
        user : instance.username,
        database : instance.database_name,
        password : instance.password
      };
    }

    res = await client.query(`
    SELECT * FROM ${config.pg.tables.INSTANCE()}
    WHERE 
      instance_id = $1 OR 
      name = $1'
    `, [id]);

    if( res.rows.length === 0 ) {
      throw new Error('Instance not found: '+id);
    }

    let instance = res.rows[0];

    // hope the password is the default
    return {
      id : instance.instance_id,
      host : instance.hostname,
      port : instance.port,
      user : config.pg.username,
      database : instance.name,
      password : config.pg.password
    };
  }

  async createUser(id, user) {
    let con = await this.getConnection(id);
    let password = utils.generatePassword();

    await client.query(
      `INSERT INTO ${config.pg.tables.DATABASE_USERS()} 
      (username, password, type, instance_database_id) VALUES 
      ($1, $2, 'PG')`, 
      [user, password, con.id]
    );

    resp = await pgInstClient.query(
      con, 
      `CREATE USER $1 WITH PASSWORD $2`, 
      [user, password]
    );

    return resp;
  }

  async resetPassword(id, user, password) {
    let con = await this.getConnection(id);

    if( !password ) password = utils.generatePassword();

    await client.query(
      `UPDATE ${config.pg.tables.DATABASE_USERS()} 
      SET password = $2 
      WHERE username = $1 AND instance_database_id = $3`, 
      [user, password, con.id]
    );

    let resp = await pgInstClient.query(
      con, 
      `ALTER USER $1 WITH PASSWORD $2`, 
      [user, password]
    );

    return resp;
  }

}