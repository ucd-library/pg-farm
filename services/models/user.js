import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js';
import logger from '../lib/logger.js';
import config from '../lib/config.js';
import utils from '../lib/utils.js';
import remoteExec from '../lib/pg-helper-remote-exec.js';

class User {

  constructor() {
    this.schema = config.adminDb.schema;
  }
 
  /**
   * @method addUser
   * @description Adds a user to a postgres instance
   * 
   * @param {String} nameOrId  PG Farm instance name or ID 
   * @param {String} orgNameOrId Organization name or ID. Can be null.
   * @param {String} username username 
   * @param {String} type USER, ADMIN, or PUBLIC.  Defaults to USER. 
   * @param {String} password optional.  defined password.  If not 
   * provided, a random password will be generated.
   * 
   * @returns {Promise}
   */
  async create(nameOrId, orgNameOrId=null, username, type='USER', password, noinherit=false) {
    let instance = await this.models.instance.exists(nameOrId, orgNameOrId);
    if( !instance ) {
      let db = await this.models.instance.getByDatabase(nameOrId, orgNameOrId);
      if( !db ) throw new Error('Instance or database not found: '+(orgNameOrId ? orgNameOrId+'/': '')+nameOrId);
      instance = await this.models.instance.get(db.instance_id);
    }

    // check for reserved users
    if( username === config.pgInstance.publicRole.username ) {
      type = 'PUBLIC';
      password = config.pgInstance.publicRole.password;
    } else if( username === config.pgRest.authenticator.username ) {
      type = 'PGREST';
      noinherit = true;
    } else if( username === config.pgInstance.adminRole ) {
      type = 'ADMIN';
      password = 'postgres';
    }

    // create new random password
    if( !password ) {
      password = utils.generatePassword();
    }

    // add user to database
    let user = await this.exists(instance.instance_id, orgNameOrId, username);
    if( !user ) {
      logger.info('Creating instance user: '+username+' on instance: '+instance.name+' for organization: '+orgNameOrId);
      await client.createInstanceUser(instance.instance_id, orgNameOrId, username, password, type);
    } else { // get current password.  make sure its set on the instance db
      logger.info('Instance user already exists: '+username+' on instance: '+instance.name+' for organization: '+orgNameOrId);
      password = user.password;

      if( type !== user.type ) {
        logger.info('Updating user type: '+username+' on instance: '+instance.name+' for organization: '+orgNameOrId, typew);
        await client.query(
          `UPDATE ${config.adminDb.tables.INSTANCE_USER} 
          SET type = $4 
          WHERE instance_user_id = ${this.schema}.get_instance_user_id($1, $2, $3)`, 
          [username, instNameOrId, orgNameOrId, type]
        );
      }
    }

    // postgres user already exists.  Update password
    if( username === config.pgInstance.adminRole ) {
      await this.resetPassword(instance.instance_id, orgNameOrId, config.pgInstance.adminRole);
      return;
    }

    // get instance connection information
    let con = await this.models.instance.getConnection(instance.name, orgNameOrId);

    logger.info('Ensuring pg user: '+username+' on instance: '+instance.name+' for organization: '+orgNameOrId);
    await pgInstClient.createOrUpdatePgUser(con, { username, password, noinherit });  
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
      SELECT * FROM ${config.adminDb.views.INSTANCE_DATABASE_USERS}
      WHERE 
        (organization_name = $2 OR organization_id=try_cast_uuid($2)) AND
        (
          (instance_name = $1 OR instance_id=try_cast_uuid($1)) OR
          (database_name = $1 OR database_id=try_cast_uuid($1))
        ) AND 
        username = $3
    `, [nameOrId, orgNameOrId, username]);

    if( resp.rows.length === 0 ) {
      throw new Error('User not found: '+username);
    } 

    return resp.rows[0];
  }

  async exists(nameOrId, orgNameOrId=null, username) {
    try {
      let user = await this.get(nameOrId, orgNameOrId, username);
      return user;
    } catch(e) {
      return false;
    }
  }



  /**
   * @method resetUserPassword
   * @description Resets a user's password to a random password
   * 
   * @param {String} instNameOrId PG Farm instance name or ID
   * @param {String} orgNameOrId PG Farm organization name or ID
   * @param {String} username 
   * @param {String} password 
   * 
   * @returns {Promise}
   */
  async resetPassword(instNameOrId, orgNameOrId=null, username, password) {
    // generate random password if not provided
    if( !password ) password = utils.generatePassword();

    let con = await this.models.instance.getConnection(instNameOrId, orgNameOrId);
    logger.info('resetting password for user: '+username+' on instance: '+con.host+' for organization: '+orgNameOrId);

    await pgInstClient.createOrUpdatePgUser(con, { username, password });

    // update database
    await client.query(
      `UPDATE ${config.adminDb.tables.INSTANCE_USER} 
      SET password = $4 
      WHERE instance_user_id = ${this.schema}.get_instance_user_id($1, $2, $3)`, 
      [username, instNameOrId, orgNameOrId, password]
    );
  }

  checkPermissionType(type) {
    if( ['SELECT', 'ALL'].indexOf(type) === -1 ) {
      throw new Error('Invalid permission type: '+type+'. Permission must be one of: SELECT or ALL');
    }
  }

  /**
   * @method grant
   * @description Simplified helper to grant a user access to a schema or table.
   * 
   * @param {String} dbNameOrId name or id of the database
   * @param {String} orgNameOrId name or id of the organization
   * @param {String} schemaName can include table name 
   * @param {String} roleName username to give access 
   * @param {String} permission must be one of 'SELECT' or 'ALL'.
   * 
   * 
   * @returns 
   */
  async grant(dbNameOrId, orgNameOrId, schemaName, roleName, permission='ALL') {
    permission = permission.toUpperCase();
    this.checkPermissionType(permission);

    let database = await this.models.database.get(dbNameOrId, orgNameOrId);

    let tableName = null;
    if( schemaName.includes('.') ) {
      let parts = schemaName.split('.');
      schemaName = parts[0];
      tableName = parts[1];
    }

    logger.info('running user grant', {
      database,
      schemaName,
      tableName,
      roleName,
      permission,
    });

    let con = await this.models.database.getConnection(
      database.database_name,
      database.organization_name,
      {useSocket: true}
    );

    // grant table access
    if( tableName ) {
      await pgInstClient.grantSchemaUsage(con, schemaName, roleName);
      await pgInstClient.grantTableAccess(con, schemaName, roleName, permission, tableName);

      // grant sequence access if permission is ALL
      // common pattern is for primary key's to be serial. So this is required for inserts
      if( permission === 'ALL' ) {
        let tableSeqs = await pgInstClient.getTableSequenceNames(con, schemaName, tableName);
        for( let seq of tableSeqs ) {
          await pgInstClient.grantSequenceUsage(con, schemaName, roleName, seq);
        }
      }

    // grant schema access
    } else {
      if( permission === 'ALL' ) {
        await pgInstClient.grantSchemaUsage(con, schemaName, roleName, ['CREATE', 'USAGE']);
      }

      await pgInstClient.grantTableAccess(con, schemaName, roleName, permission);

      // grant function access if permission is ALL
      if( permission === 'ALL' ) {
        await pgInstClient.grantFnUsage(con, schemaName, roleName);
        await pgInstClient.grantSequenceUsage(con, schemaName, roleName);
      }
    }

  }

  async remoteGrant(dbNameOrId, orgNameOrId, schemaName, roleName, permission='ALL') {
    this.checkPermissionType(permission);

    let db = await this.models.database.get(dbNameOrId, orgNameOrId);
    return remoteExec(
      db.instance_hostname, 
      `/grant/${db.database_name}/${schemaName}/${roleName}/${permission}`,
      {method: 'PUT'}
    );
  }

}


const user = new User();
export default user;