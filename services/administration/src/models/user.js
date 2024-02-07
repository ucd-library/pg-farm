import client from '../../../lib/pg-admin-client.js';
import pgInstClient from '../../../lib/pg-client.js';
import pgFormat from 'pg-format';
import logger from '../../../lib/logger.js';
import config from '../../../lib/config.js';
import utils from '../../../lib/utils.js';

class User {
 
  /**
   * @method addUser
   * @description Adds a user to a postgres instance
   * 
   * @param {String} nameOrId  PG Farm instance name or ID 
   * @param {String} orgNameOrId Organization name or ID. Can be null.
   * @param {String} user username 
   * @param {String} type USER, ADMIN, or PUBLIC.  Defaults to USER. 
   * @param {String} password optional.  defined password.  If not 
   * provided, a random password will be generated.
   * 
   * @returns {Promise}
   */
  async create(nameOrId, orgNameOrId=null, user, type='USER', password, noinherit=false) {
    let instance = await this.models.instance.exists(nameOrId, orgNameOrId);
    if( !instance ) {
      let db = await this.models.database.exists(nameOrId, orgNameOrId);
      if( !db ) throw new Error('Instance or database not found: '+(orgNameOrId ? orgNameOrId+'/': '')+nameOrId);
      instance = await this.models.instance.get(db.instance_id);
    }

    // check for reserved users
    if( user === config.pgInstance.publicRole.username ) {
      type = 'PUBLIC';
      password = config.pgInstance.publicRole.password;
    } else if( user === config.pgRest.authenticator.username ) {
      type = 'PGREST';
      noinherit = true;
    } else if( user === config.pgInstance.adminRole ) {
      type = 'ADMIN';
      password = 'postgres';
    }

    // create new random password
    if( !password ) {
      password = utils.generatePassword();
    }

    // add user to database
    await client.getInstanceUser(instance.instance_id, user, password, type);

    // postgres user already exists.  Update password
    if( user === config.pgInstance.adminRole ) {
      await this.resetPassword(instance.instance_id, config.pgInstance.adminRole);
      return;
    }

    // get instance connection information
    let con = {
      host : instance.hostname,
      port : user.instance_port,
      user : user.username,
      database : user.database_name,
      password : user.password
    };

    // add user to postgres
    if( noinherit ) noinherit = 'NOINHERIT';
    else noinherit = '';

    let formattedQuery = pgFormat('CREATE ROLE "%s" LOGIN '+noinherit+' PASSWORD %L', user, password);
    let resp = await pgInstClient.query(
      con, 
      formattedQuery,
    );

    return resp;
  }

  /**
   * @method get
   * @description Returns a user.  Provide either instance or database plus
   * the organization.
   * 
   * @param {String} nameOrId can be name or id of the database or instance 
   * @param {String} orgNameOrId organization name or id 
   * @param {String} username username
   * @returns {Promise<Object>}
   */
  async get(nameOrId, orgNameOrId=null, username) {
    let resp = await client.query(`
      SELECT * FROM ${config.adminDb.views.INSTANCE_DATABSE_USERS}
      WHERE 
        (organization_name = $1 OR organization_id=try_cast_uuid($1)) AND
        (
          (instance_name = $1 OR instance_id=try_cast_uuid($1)) OR
          (database_name = $1 OR database_id=try_cast_uuid($1))
        ) AND 
        username = $2
    `, [nameOrId, orgNameOrId, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    } 

    return resp.rows[0];
  }

  /**
   * @method resetUserPassword
   * @description Resets a user's password to a random password
   * 
   * @param {String} instNameOrId PG Farm instance name or ID
   * @param {String} orgNameOrId PG Farm organization name or ID
   * @param {String} user 
   * @param {String} password 
   * 
   * @returns {Promise}
   */
  async resetPassword(instNameOrId, orgNameOrId, user, password) {
    // TODO: should this just force the instance on??
    let con = await this.models.database.getConnection(instNameOrId, orgNameOrId);

    // generate random password if not provided
    if( !password ) password = utils.generatePassword();

    // update database
    // TODO: move this to client
    await client.query(
      `UPDATE ${config.adminDb.tables.DATABASE_USERS} 
      SET password = $2 
      WHERE username = $1 AND instance_id = $3`, 
      [user, password, con.id]
    );

    await this.setDbPassword(instNameOrId, orgNameOrId, user, password);
  }

  /**
   * @method setDbPassword
   * @description Sets a user's (pg role) password in the postgres instance
   * 
   * @param {*} instNameOrId 
   * @param {*} orgNameOrId 
   * @param {*} username 
   * @param {*} password 
   * @returns 
   */
  async setDbPassword(instNameOrId, orgNameOrId, username, password) {
    let con = await this.getConnection(instNameOrId, orgNameOrId);
    // let user = await this.getUser(instNameOrId, orgNameOrId, username);

    // update postgres instance users password
    let formattedQuery = pgFormat('ALTER USER %s WITH PASSWORD %L', username, password);
    let resp = await pgInstClient.query(
      con, 
      formattedQuery
    );

    return resp;
  }

}


const user = new User();
export default user;