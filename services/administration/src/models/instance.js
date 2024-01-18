import utils from  '../../../lib/utils.js'
import pgInstClient from '../../../lib/pg-client.js';
import adminClient from '../../../lib/pg-admin-client.js';
import config from '../../../config.js';
import waitUntil from '../../../lib/wait-util.js';


class PgInstance {

  setAdminModel(adminModel) {
    this.adminModel = adminModel;
  }

  async getConnection(id) {
    let user = await adminClient.getUser(id, 'postgres');

    return {
      id : user.database_id,
      host : user.database_hostname,
      port : user.database_port,
      user : user.username,
      database : user.database_name,
      password : user.password
    };
  }

  async createUser(id, user, type='USER') {
    let con = await this.getConnection(id);

    let password = utils.generatePassword();

    await client.query(
      `INSERT INTO ${config.pg.tables.DATABASE_USERS()} 
      (username, password, type, instance_id) VALUES 
      ($1, $2, $3, $4)`, 
      [user, password, type, con.id]
    );

    // TODO: check if instance is running 
    await this.adminModel.startInstance(id);
    await waitUntil(con.host, con.port);

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
      WHERE username = $1 AND instance_id = $3`, 
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