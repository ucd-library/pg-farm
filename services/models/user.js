import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js';
import logger from '../lib/logger.js';
import config from '../lib/config.js';
import utils from '../lib/utils.js';
import {getContext} from '../lib/context.js';
import ucdIamApi from '../lib/ucd-iam-api.js';

class User {

  constructor() {
    this.ALLOWED_PERMISSION_TYPES = ['READ', 'WRITE'];
    this.schema = config.adminDb.schema;
  }

  getUserForLogging(user) {
    let l = [];
    for( let key in user ) {
      if( key === 'password' ) {
        l.push(key+': <hidden>');
      } else {
        l.push(key+':"'+user[key]+'"');
      }
    }
    return l.join(', ');
  }

  /**
   * @method addUser
   * @description Adds a user to a postgres instance
   *
   * @param {String|Object} nameOrId Context object or id
   * @param {Object} user user object
   * @param {String} user.username username
   * @param {String} user.type USER, ADMIN, or PUBLIC.  Defaults to USER.
   * @param {String} user.password optional.  defined password.  If not
   * provided, a random password will be generated.
   * @param {Boolean} user.noinherit optional.  Defaults to false.
   * @param {String} user.parent optional.  Parent user.  Only used for 'SERVICE_ACCOUNT' type
   *
   * @returns {Promise}
   */
  async create(ctx, user) {
    ctx = getContext(ctx);

    if( !user.type ) user.type = 'USER';
    if( !user.noinherit ) user.noinherit = false;

    let instanceExists = await this.models.instance.exists(ctx);
    if( !instanceExists ) {
      throw new Error('Instance or database not found: '+ctx.fullDatabaseName);
    }

    // check for reserved users
    if( user.username === config.pgInstance.publicRole.username ) {
      user.type = 'PUBLIC';
      user.password = config.pgInstance.publicRole.password;
    } else if( user.username === config.pgRest.authenticator.username ) {
      user.type = 'PGREST';
      user.noinherit = true;
    } else if( user.username === config.pgInstance.adminRole ) {
      user.type = 'ADMIN';
      user.password = 'postgres';
    }

    // create new random password
    if( !user.password ) {
      user.password = utils.generatePassword();
    }

    // add user to database
    let existingUser = await this.exists(ctx, user.username);
    if( !existingUser ) {

      logger.info('Creating instance user', this.getUserForLogging(user), ctx.logSignal);
      await client.createInstanceUser(ctx, user);

      // check if user exists in UCD IAM
      if ( !parent ){
        await this.fetchAndUpdateUcdIamData(user.username);
      }
    } else { // get current password.  make sure its set on the instance db
      logger.info('Instance user already exists', this.getUserForLogging(user), ctx.logSignal);
      password = user.password;

      if( existingUser.type !== user.type ) {
        await this.updateType(ctx, user);
      }
    }

    // postgres user already exists.  Update password
    if( user.username === config.pgInstance.adminRole ) {
      await this.resetPassword(ctx, config.pgInstance.adminRole);
      return;
    }

    // get instance connection information
    let con = await this.models.instance.getConnection(ctx);

    logger.info('Ensuring pg user', username, ctx.logSignal);
    await pgInstClient.createOrUpdatePgUser(con, { username, password, noinherit });
  }

  /**
   * @method updateType
   * @description Updates the type of a instance user
   * 
   * @param {Object|String} ctx context object or id
   * @param {Object} user
   * @param {String} user.username username
   * @param {String} user.type USER, ADMIN, or PUBLIC.  Defaults to USER. 
   * @returns 
   */
  updateType(ctx, user) {
    ctx = getContext(ctx);
    logger.info('Updating user type', this.getUserForLogging(user), ctx.logSignal);

    return client.query(
      `UPDATE ${config.adminDb.tables.INSTANCE_USER}
      SET type = $4
      WHERE instance_user_id = ${this.schema}.get_instance_user_id($1, $2, $3)`,
      [user.username, ctx.instance.name, ctx.organization.name, user.type]
    );
  }

  /**
   * @description Fetches the user profile from UCD IAM and updates the user record in the database
   * @param {String} username - username (kerberos ID) of the user
   */
  async fetchAndUpdateUcdIamData(username) {
    let ucdUserProfile;
    try {
      ucdUserProfile = await ucdIamApi.getUserProfile(username);
    } catch (e) {
      logger.info('Error checking UCD IAM for user: '+username, e);
      return;
    }
    if ( !ucdUserProfile ) return;
    const firstName = ucdUserProfile?.dFirstName || '';
    const lastName = ucdUserProfile?.dLastName || '';
    const middleName = ucdUserProfile?.dMiddleName || '';
    await client.query(
      `UPDATE ${config.adminDb.tables.USER}
      SET first_name = $2, last_name = $3, middle_name = $4, ucd_iam_payload = $5, ucd_iam_fetched_at = NOW()
      WHERE user_id = ${this.schema}.get_user_id($1)`,
      [username, firstName, lastName, middleName, ucdUserProfile]
    );
    return ucdUserProfile;
  }

  async pgFarmUserExists(username) {
    const res = await this.getPgFarmUser(username);
    return res ? true : false;
  }

  /**
   * @description Gets user object without being tied to an instance or database
  */
  async getPgFarmUser(username) {
    const res = await client.query(
      `SELECT * FROM ${config.adminDb.tables.USER}
      WHERE user_id = ${this.schema}.get_user_id($1)`,
      [username]
    );
    return res.rows[0];
  }

  /**
   * @method delete
   * @description Deletes a user from the database and instance
   * 
   * @param {String|Object} ctx context object or id 
   * @param {String} username 
   */
  async delete(ctx, username) {
    ctx = getContext(ctx);

    // get instance connection information
    let con = await this.models.instance.getConnection(ctx);

    // get all databases for instance
    let databases = await pgInstClient.listDatabases(con);

    for( let db of databases.rows ) {
      con.database = db.datname;
      logger.info('Removing pg user', username, ctx.logSignal);
      try {
        // reassign owned objects
        await pgInstClient.reassignOwnedBy(con, { username });

        // revoke all access from all schemas
        let schemas = await pgInstClient.listSchema(con);
        for( let schema of schemas.rows ) {
          await this.revoke(con, null, schema.schema_name, username, 'READ');
        }

        // revoke access from database and finally delete user
        await pgInstClient.deletePgUser(con, { username });
      } catch(e) {
        logger.error('Error removing pg user ', {error: e}, ctx.logSignal);
      }
    }

    // remove user to database
    try {
      logger.info('Deleting pg farm instance user', username, ctx.logSignal);
      await client.deleteInstanceUser(ctx, username);
    } catch(e) {
      logger.error('Error deleting user', username, {error: e}, ctx.logSignal);
    }
  }

  /**
   * @method get
   * @description Returns a user.  Provide either instance or database plus
   * the organization.
   *
   * @param {String} ctx context object or id
   * @param {String} username username
   * @returns {Promise<Object>}
   */
  async get(ctx, username) {
    ctx = getContext(ctx);
    return client.getInstanceUser(ctx, username);
  }

  /**
   * @method exists
   * @description Checks if a user exists in the database.  
   * If the user exists, it will return the user object.
   * 
   * @param {String|Object} ctx context object or id
   * @param {String} username 
   * @returns 
   */
  async exists(ctx, username) {
    // no need to get context, get() will do that
    try {
      let user = await this.get(ctx, username);
      return user;
    } catch(e) {
      return false;
    }
  }

  /**
   * @method resetUserPassword
   * @description Resets a user's password to a random password
   *
   * @param {String} ctx context object or id
   * @param {String} username
   * @param {String} password
   * @param {Boolean} updateInstance if true, update the instance with the new password
   *
   * @returns {Promise<String>} new password
   */
  async resetPassword(ctx, username, password, updateInstance=true) {
    ctx = getContext(ctx);

    // generate random password if not provided
    if( !password ) password = utils.generatePassword();

    let con = await this.models.instance.getConnection(ctx);
    logger.info('resetting password for user ', username, ctx.logSignal);

    if( updateInstance ) {
      await pgInstClient.createOrUpdatePgUser(con, { username, password });
    }

    // update database
    await client.query(
      `UPDATE ${config.adminDb.tables.INSTANCE_USER}
      SET password = $4
      WHERE instance_user_id = ${this.schema}.get_instance_user_id($1, $2, $3)`,
      [username, ctx.instance.name, ctx.organization.name, password]
    );

    return password;
  }

  /**
   * @method checkPermissionType
   * @description Checks if the permission type is valid
   * 
   * @param {String} type 
   */
  checkPermissionType(type) {
    if( this.ALLOWED_PERMISSION_TYPES.indexOf(type) === -1 ) {
      throw new Error('Invalid permission type: '+type+'. Permission must be one of: '+this.ALLOWED_PERMISSION_TYPES.join(', '));
    }
  }

  /**
   * @method grantDatabaseAccess
   * @description Grants a user access to a database
   * 
   * @param {Object|String} ctx context object or id
   * @param {*} roleName 
   * @param {*} permission 
   * @returns 
   */
  async grantDatabaseAccess(ctx, roleName, permission='READ') {
    ctx = getContext(ctx);
    
    this.checkPermissionType(permission);

    let database = await this.models.database.get(ctx);

    if( permission === 'WRITE' ) {
      //permission = pgInstClient.ALL_PRIVILEGE;
      permission = pgInstClient.GRANTS.DATABASE.WRITE;
    } else {
      permission = pgInstClient.GRANTS.DATABASE.READ;
    }

    logger.info(
      'running user database grant', 
      logger.objToString({database, roleName, permission}),
      ctx.logSignal
    );

    let con = await this.models.database.getConnection(ctx);

    return pgInstClient.grantDatabaseAccess(con, ctx.database.name, roleName, permission);
  }

  /**
   * @method revokeDatabaseAccess
   * @description Revokes a user's access to a database
   * 
   * @param {Object|String} ctx 
   * @param {*} roleName 
   * @param {*} permission 
   * @returns 
   */
  async revokeDatabaseAccess(ctx, roleName, permission='READ') {
    ctx = getContext(ctx);

    this.checkPermissionType(permission);

    if( permission === 'WRITE' ) {
      permission = pgInstClient.GRANTS.DATABASE.WRITE;
    } else {
      permission = pgInstClient.ALL_PRIVILEGE;
    }

    logger.info('running user database revoke', 
      logger.objToString({roleName, permission}),
      ctx.logSignal
    );

    let con = await this.models.database.getConnection(ctx);

    return pgInstClient.revokeDatabaseAccess(con, ctx.database.name, roleName, permission);
  }

  /**
   * @method grant
   * @description Simplified helper to grant a user access to a schema or table.
   *
   * @param {String} dbNameOrId name or id of the database
   * @param {String} orgNameOrId name or id of the organization
   * @param {String} schemaName can include table name
   * @param {String} roleName username to give access
   * @param {String} permission must be one of 'READ' or 'WRITE'.
   *
   *
   * @returns
   */
  async grant(dbNameOrId, orgNameOrId, schemaName, roleName, permission='READ') {
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
      database.organization_name
    );

    // grant table access
    if( tableName ) {
      await pgInstClient.grantSchemaAccess(con, schemaName, roleName, pgInstClient.GRANTS.SCHEMA.READ);

      // grant sequence access if permission is ALL
      // common pattern is for primary key's to be serial. So this is required for inserts
      if( permission === 'WRITE' ) {
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, tableName, 'TABLE');

        let tableSeqs = await pgInstClient.getTableSequenceNames(con, schemaName, tableName);
        for( let seq of tableSeqs ) {
          await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, seq, 'SEQUENCE');
        }
      } else {
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.TABLE.READ, tableName, 'TABLE');
      }

    // grant schema access
    } else {

      if( permission === 'WRITE' ) {
        await pgInstClient.grantSchemaAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES);
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.TABLES);
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.FUNCTIONS);
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.SEQUENCES);
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.TYPES);
      } else {
        await pgInstClient.grantSchemaAccess(con, schemaName, roleName, pgInstClient.GRANTS.SCHEMA.READ);
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.TABLE.READ, pgInstClient.ALL.TABLES);
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.FUNCTION.EXECUTE, pgInstClient.ALL.FUNCTIONS);
        await pgInstClient.grantSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.SEQUENCE.READ, pgInstClient.ALL.SEQUENCES);
      }

    }
  }

  async revoke(dbNameOrId, orgNameOrId, schemaName, roleName, permission='READ') {
    let con;

    if ( typeof dbNameOrId === 'object' ) {
      con = dbNameOrId;
    } else {
      let database = await this.models.database.get(dbNameOrId, orgNameOrId);

      con = await this.models.database.getConnection(
        database.database_name,
        database.organization_name
      );
    }

    let tableName = null;
    if( schemaName.includes('.') ) {
      let parts = schemaName.split('.');
      schemaName = parts[0];
      tableName = parts[1];
    }

    logger.info('running user revoke', {
      database: con.database,
      schemaName,
      tableName,
      roleName
    });

    // revoke table access
    if( tableName ) {

      if( permission === 'READ' ) {
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, tableName, 'TABLE');
      } else {
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.TABLE.WRITE, tableName, 'TABLE');
      }


      let tableSeqs = await pgInstClient.getTableSequenceNames(con, schemaName, tableName);
      for( let seq of tableSeqs ) {
        if( permission === 'READ' ) {
          await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, seq, 'SEQUENCE');
        } else {
          await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.SEQUENCE.WRITE, seq, 'SEQUENCE');
        }
      }

    // grant schema access
    } else {
      if( permission === 'READ' ) {
        await pgInstClient.revokeSchemaAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGE);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.TABLES);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.FUNCTIONS);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.SEQUENCES);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES, pgInstClient.ALL.TYPES);
      } else {
        await pgInstClient.revokeSchemaAccess(con, schemaName, roleName, pgInstClient.GRANTS.SCHEMA.WRITE);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.TABLE.WRITE, pgInstClient.ALL.TABLES);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.FUNCTION.EXECUTE, pgInstClient.ALL.FUNCTIONS);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.SEQUENCE.WRITE, pgInstClient.ALL.SEQUENCES);
        await pgInstClient.revokeSchemaObjectAccess(con, schemaName, roleName, pgInstClient.GRANTS.TYPE.WRITE, pgInstClient.ALL.TYPES);
      }
    }
  }

}


const user = new User();
export default user;
