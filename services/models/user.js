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
   * @param {Boolean} noinherit optional.  Defaults to false.
   * @param {String} parent optional.  Parent user.  Only used for 'SERVICE_ACCOUNT' type
   *
   * @returns {Promise}
   */
  async create(nameOrId, orgNameOrId=null, username, type='USER', password, noinherit=false, parent=null) {
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
      logger.info('Creating instance user: ', {
        username, type, parent,
        instance: instance.name,
        organization: orgNameOrId
      });
      await client.createInstanceUser(instance.instance_id, orgNameOrId, username, password, type, parent);
    } else { // get current password.  make sure its set on the instance db
      logger.info('Instance user already exists: '+username+' on instance: '+instance.name+' for organization: '+orgNameOrId);
      password = user.password;

      if( type !== user.type ) {
        logger.info('Updating user type: '+username+' on instance: '+instance.name+' for organization: '+orgNameOrId, type);
        await this.updateType(nameOrId, orgNameOrId, username, type);
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

  updateType(nameOrId, orgNameOrId=null, username, type) {
    return client.query(
      `UPDATE ${config.adminDb.tables.INSTANCE_USER}
      SET type = $4
      WHERE instance_user_id = ${this.schema}.get_instance_user_id($1, $2, $3)`,
      [username, nameOrId, orgNameOrId, type]
    );
  }

  async delete(nameOrId, orgNameOrId=null, username) {
    let instance = await this.models.instance.exists(nameOrId, orgNameOrId);
    if( !instance ) {
      let db = await this.models.instance.getByDatabase(nameOrId, orgNameOrId);
      if( !db ) throw new Error('Instance or database not found: '+(orgNameOrId ? orgNameOrId+'/': '')+nameOrId);
      instance = await this.models.instance.get(db.instance_id);
    }

    // get instance connection information
    let con = await this.models.instance.getConnection(instance.name, orgNameOrId);

    // get all databases for instance
    let databases = await pgInstClient.listDatabases(con);

    for( let db of databases.rows ) {
      con.database = db.datname;
      logger.info('Removing pg user: '+username+' from instance='+orgNameOrId+'/'+instance.name+' database='+db.datname);
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
        logger.error('Error deleting user: '+username, instance, db.datname, e);
      }
    }

    // remove user to database
    try {
      logger.info('Deleting pg farm instance user: ', {
        username,
        instance: instance.name,
        organization: orgNameOrId
      });
      await client.deleteInstanceUser(instance.instance_id, orgNameOrId, username);
    } catch(e) {
      logger.error('Error deleting user: '+username, instance, e);
    }
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
    return client.getInstanceUser(nameOrId, orgNameOrId, username);
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
    if( ['READ', 'WRITE'].indexOf(type) === -1 ) {
      throw new Error('Invalid permission type: '+type+'. Permission must be one of: READ, WRITE');
    }
  }

  async grantDatabaseAccess(dbNameOrId, orgNameOrId, roleName, permission='READ') {
    this.checkPermissionType(permission);

    let database = await this.models.database.get(dbNameOrId, orgNameOrId);

    if( permission === 'WRITE' ) {
      //permission = pgInstClient.ALL_PRIVILEGE;
      permission = pgInstClient.GRANTS.DATABASE.WRITE;
    } else {
      permission = pgInstClient.GRANTS.DATABASE.READ;
    }

    logger.info('running user database grant', {
      database,
      roleName,
      permission: pgInstClient.GRANTS.DATABASE
    });

    let con = await this.models.database.getConnection(
      database.database_name,
      database.organization_name
    );

    return pgInstClient.grantDatabaseAccess(con, database.database_name, roleName, permission);
  }

  async revokeDatabaseAccess(dbNameOrId, orgNameOrId, roleName, permission='READ') {
    this.checkPermissionType(permission);

    if( permission === 'WRITE' ) {
      permission = pgInstClient.GRANTS.DATABASE.WRITE;
    } else {
      permission = pgInstClient.ALL_PRIVILEGE;
    }

    let database = await this.models.database.get(dbNameOrId, orgNameOrId);

    logger.info('running user database revoke', {
      database,
      roleName,
      permission: pgInstClient.GRANTS.DATABASE[permission]
    });

    let con = await this.models.database.getConnection(
      database.database_name,
      database.organization_name
    );

    return pgInstClient.revokeDatabaseAccess(con, database.database_name, roleName, permission);
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
        await pgInstClient.revokeSchemaAccess(con, schemaName, roleName, pgInstClient.ALL_PRIVILEGES);
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
