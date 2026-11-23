import client from '../lib/pg-admin-client.js';
import pgInstClient from '../lib/pg-instance-client.js';
import config from '../lib/config.js';
import logger from '../lib/logger.js';
import {getContext} from '../lib/context.js';
import {summarizeDatabase, totalCounts} from '../lib/role-privilege-summary.js';

/**
 * @class PublicUser
 * @description Manage the instance level public user account (default: pgfarm-public).
 *
 * The public user is enabled for an instance if, and only if, an instance_user row of type
 * PUBLIC exists for the instance in the admin database.  When enabled, the public user can
 * log in via the gateway with the shared public password, and PostgREST uses it as the
 * anonymous role (db-anon-role).  When disabled, the admin row and the postgres role are
 * removed, along with all of the role's privileges in every database on the instance.
 */
class PublicUser {

  constructor() {
    this.ROLE = config.pgInstance.publicRole.username;
  }

  /**
   * @method isEnabled
   * @description Check if the public user is enabled for the context instance
   *
   * @param {String|Object} ctx context object or id
   *
   * @returns {Promise<Boolean>}
   */
  async isEnabled(ctx) {
    ctx = getContext(ctx);
    this._requireInstance(ctx);
    return client.isPublicUserEnabled(ctx.instance.instance_id);
  }

  /**
   * @method getPermissionSummary
   * @description Get a summary of the public user account for an instance.  This includes the
   * enabled state, recent public SQL login activity (via the gateway) and, if the instance is
   * running, the tables/views the public role has direct READ or WRITE privileges on in every
   * database on the instance.  These are the privileges that are removed when the public user
   * is disabled.
   *
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {Boolean} opts.useSocket optional.  connect via unix socket (pg-helper only)
   *
   * @returns {Promise<Object>}
   */
  async getPermissionSummary(ctx, opts={}) {
    ctx = getContext(ctx);
    this._requireInstance(ctx);

    let instance = ctx.instance;
    let enabled = await client.isPublicUserEnabled(instance.instance_id);
    let recentLogins = await client.getPublicLoginActivity(instance.instance_id);

    let summary = {
      organization : ctx.organization?.name || null,
      instance : instance.name,
      instanceState : instance.state,
      instanceRunning : instance.state === config.pgInstance.states.RUN,
      username : this.ROLE,
      enabled,
      pgRestAnonymous : enabled,
      roleExists : null,
      recentLogins,
      databases : [],
      counts : {read: 0, write: 0, other: 0},
      errors : []
    };

    if( !summary.instanceRunning && !opts.useSocket ) {
      return summary;
    }

    let baseCon = await this._getConnection(ctx, 'postgres', opts);
    summary.roleExists = await pgInstClient.roleExists(baseCon, this.ROLE);
    if( !summary.roleExists ) {
      return summary;
    }

    let databases = await pgInstClient.listConnectableDatabases(baseCon);
    for( let dbName of databases ) {
      try {
        let con = await this._getConnection(ctx, dbName, opts);
        let privs = await pgInstClient.getRoleDirectPrivileges(con, this.ROLE);
        let dbSummary = summarizeDatabase(dbName, privs);

        // only report databases where the role actually has something
        if( dbSummary.tables.length || dbSummary.schemas.length ||
            dbSummary.defaultPrivilegeCount || dbSummary.databasePrivileges.length ) {
          summary.databases.push(dbSummary);
        }
      } catch(e) {
        logger.warn('Failed to get public user privileges for database', dbName, e.message, ctx.logSignal);
        summary.errors.push({database: dbName, message: e.message});
      }
    }

    summary.counts = totalCounts(summary.databases);
    return summary;
  }

  /**
   * @method enable
   * @description Enable the public user for an instance.  Creates the admin instance_user row
   * and postgres role (LOGIN, shared public password), grants the public role access to the
   * PostgREST api schema in every registered database and restarts PostgREST so anonymous
   * API access is enabled.  Table permissions removed by a previous disable are NOT restored.
   *
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {Boolean} opts.dryRun optional.  If true, return the planned steps without making changes
   *
   * @returns {Promise<Object>} {dryRun, enabled, steps, errors}
   */
  async enable(ctx, opts={}) {
    ctx = getContext(ctx);
    this._requireRunning(ctx);

    let alreadyEnabled = await client.isPublicUserEnabled(ctx.instance.instance_id);
    let databases = await client.getInstanceDatabases(ctx);

    let steps = [
      `Create pg farm instance user ${this.ROLE} (type PUBLIC)`,
      `Create or update postgres role ${this.ROLE} with LOGIN and the shared public password`,
      ...databases.map(db => `Grant ${this.ROLE} access to the ${config.pgRest.schema} schema in database ${db.name}`),
      ...databases.map(db => `Restart PostgREST for database ${db.name} (enables anonymous API access)`)
    ];

    let result = {
      dryRun : opts.dryRun === true,
      alreadyEnabled,
      instance : ctx.instance.name,
      steps,
      errors : []
    };

    if( opts.dryRun ) {
      return result;
    }

    logger.info('Enabling public user', this.ROLE, ctx.logSignal);

    // admin row + postgres role + password
    await this.models.user.create(ctx, {username: this.ROLE}, {allowReserved: true});

    // api schema grants in every registered database
    for( let db of databases ) {
      try {
        let con = await this._getConnection(ctx, db.name);
        await this.models.pgRest.grantPublicApiAccess(ctx, con);
      } catch(e) {
        logger.error('Failed to grant public api access', db.name, e.message, ctx.logSignal);
        result.errors.push({database: db.name, step: 'grant-api-access', message: e.message});
      }
    }

    // restart PostgREST so the config is regenerated with db-anon-role
    await this._restartPgRest(ctx, databases, result);

    result.enabled = await client.isPublicUserEnabled(ctx.instance.instance_id);
    return result;
  }

  /**
   * @method disable
   * @description Disable (remove) the public user for an instance.  The permission summary is
   * always gathered first and returned.  Order of operations:
   *  1. delete the admin instance_user row (gateway immediately blocks new public logins)
   *  2. restart PostgREST for each database (config regenerated without db-anon-role)
   *  3. terminate active public role sessions
   *  4. REASSIGN OWNED + DROP OWNED in every database on the instance (removes all privileges)
   *  5. DROP ROLE
   * PostgREST is restarted even if later steps fail.  This method is idempotent.
   *
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {Boolean} opts.dryRun optional.  If true, return the summary and planned steps without making changes
   *
   * @returns {Promise<Object>} {dryRun, summary, steps, errors, enabled}
   */
  async disable(ctx, opts={}) {
    ctx = getContext(ctx);
    this._requireRunning(ctx);

    let summary = await this.getPermissionSummary(ctx);
    let databases = await client.getInstanceDatabases(ctx);

    let steps = [
      `Delete pg farm instance user ${this.ROLE} (blocks new public logins)`,
      ...databases.map(db => `Restart PostgREST for database ${db.name} (disables anonymous API access)`),
      `Terminate active sessions for postgres role ${this.ROLE}`,
      `Remove all privileges for ${this.ROLE} in every database on the instance (REASSIGN OWNED / DROP OWNED)`,
      `Drop postgres role ${this.ROLE}`
    ];

    let result = {
      dryRun : opts.dryRun === true,
      instance : ctx.instance.name,
      summary,
      steps,
      errors : []
    };

    if( opts.dryRun ) {
      return result;
    }

    logger.info('Disabling public user', this.ROLE, ctx.logSignal);

    // 1. delete admin row first so the gateway blocks new logins
    await client.deleteInstanceUser(ctx, this.ROLE);

    // 2-5. always restart PostgREST, even if the role cleanup fails
    try {
      await this.dropRole(ctx, {errors: result.errors});
    } finally {
      await this._restartPgRest(ctx, databases, result);
    }

    result.enabled = await client.isPublicUserEnabled(ctx.instance.instance_id);

    if( result.errors.find(e => e.step === 'drop-role') ) {
      let err = new Error('Failed to drop public role '+this.ROLE+': '+
        result.errors.map(e => (e.database ? e.database+': ' : '')+e.message).join('; '));
      err.result = result;
      throw err;
    }

    return result;
  }

  /**
   * @method dropRole
   * @description Remove the public postgres role from the instance: terminate sessions,
   * REASSIGN OWNED + DROP OWNED in every connectable database, then DROP ROLE.  Does not
   * touch the admin database or PostgREST.  No-op if the role does not exist.
   *
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {Array} opts.errors optional.  array to collect errors in
   * @param {Boolean} opts.useSocket optional.  connect via unix socket (pg-helper only)
   *
   * @returns {Promise<Boolean>} true if the role was dropped or did not exist
   */
  async dropRole(ctx, opts={}) {
    ctx = getContext(ctx);
    let errors = opts.errors || [];

    let baseCon = await this._getConnection(ctx, 'postgres', opts);
    let exists = await pgInstClient.roleExists(baseCon, this.ROLE);
    if( !exists ) {
      logger.info('Public role does not exist on instance, nothing to drop', ctx.logSignal);
      return true;
    }

    let terminated = await pgInstClient.terminateRoleSessions(baseCon, this.ROLE);
    logger.info('Terminated public role sessions', terminated, ctx.logSignal);

    let databases = await pgInstClient.listConnectableDatabases(baseCon);
    for( let dbName of databases ) {
      try {
        let con = await this._getConnection(ctx, dbName, opts);
        logger.info('Dropping privileges owned by public role', dbName, ctx.logSignal);
        await pgInstClient.dropOwnedByRole(con, this.ROLE);
      } catch(e) {
        logger.error('Failed to drop owned by public role', dbName, e.message, ctx.logSignal);
        errors.push({database: dbName, step: 'drop-owned', message: e.message});
      }
    }

    try {
      await pgInstClient.dropRoleIfExists(baseCon, this.ROLE);
      logger.info('Dropped public role', this.ROLE, ctx.logSignal);
    } catch(e) {
      logger.error('Failed to drop public role', this.ROLE, e.message, ctx.logSignal);
      errors.push({step: 'drop-role', message: e.message});
      return false;
    }

    return true;
  }

  /**
   * @method reconcile
   * @description Make the postgres role match the admin database state.
   *  - disabled but the role exists (e.g. restored from an old backup): drop the role
   *  - enabled but the role is missing: create the role and re-apply api schema grants
   * Does not require the RUN state so it can be run by the pg-helper during a restore.
   *
   * @param {String|Object} ctx context object or id
   * @param {Object} opts
   * @param {Boolean} opts.useSocket optional.  connect via unix socket (pg-helper only)
   *
   * @returns {Promise<String>} action taken: 'none', 'dropped' or 'created'
   */
  async reconcile(ctx, opts={}) {
    ctx = getContext(ctx);
    this._requireInstance(ctx);

    let enabled = await client.isPublicUserEnabled(ctx.instance.instance_id);
    let baseCon = await this._getConnection(ctx, 'postgres', opts);
    let exists = await pgInstClient.roleExists(baseCon, this.ROLE);

    if( !enabled && exists ) {
      logger.info('Public user disabled but role exists, dropping role', ctx.logSignal);
      let errors = [];
      await this.dropRole(ctx, {...opts, errors});
      if( errors.length ) {
        logger.warn('Errors reconciling public role', logger.objToString({errors: JSON.stringify(errors)}), ctx.logSignal);
      }
      return 'dropped';
    }

    if( enabled && !exists ) {
      logger.info('Public user enabled but role missing, creating role', ctx.logSignal);
      await pgInstClient.createOrUpdatePgUser(baseCon, {
        username : this.ROLE,
        password : config.pgInstance.publicRole.password
      });
      let databases = await client.getInstanceDatabases(ctx);
      for( let db of databases ) {
        try {
          let con = await this._getConnection(ctx, db.name, opts);
          await this.models.pgRest.grantPublicApiAccess(ctx, con);
        } catch(e) {
          logger.warn('Failed to grant public api access during reconcile', db.name, e.message, ctx.logSignal);
        }
      }
      return 'created';
    }

    return 'none';
  }

  /**
   * @method _restartPgRest
   * @description Restart PostgREST for each database, collecting errors
   *
   * @param {Object} ctx context object
   * @param {Array<Object>} databases admin db database rows
   * @param {Object} result result object with errors array
   */
  async _restartPgRest(ctx, databases, result) {
    for( let db of databases ) {
      try {
        let dbCtx = ctx.clone();
        await dbCtx.update({database: db.name});
        await this.models.pgRest.restart(dbCtx);
      } catch(e) {
        logger.error('Failed to restart PostgREST', db.name, e.message, ctx.logSignal);
        result.errors.push({database: db.name, step: 'restart-pgrest', message: e.message});
      }
    }
  }

  /**
   * @method _getConnection
   * @description Get an admin (postgres) connection object for a specific database on the
   * context instance.
   *
   * @param {Object} ctx context object
   * @param {String} dbName database name
   * @param {Object} opts
   * @param {Boolean} opts.useSocket optional.  connect via unix socket (pg-helper only)
   *
   * @returns {Promise<Object>}
   */
  async _getConnection(ctx, dbName, opts={}) {
    if( opts.useSocket ) {
      return {
        host : '/var/run/postgresql',
        user : config.pgInstance.adminRole,
        database : dbName
      };
    }
    let con = await this.models.instance.getConnection(ctx);
    con.database = dbName;
    return con;
  }

  /**
   * @method _requireInstance
   * @description Throw if the context has no instance
   *
   * @param {Object} ctx context object
   */
  _requireInstance(ctx) {
    if( !ctx?.instance?.instance_id ) {
      throw new Error('Instance not found in context');
    }
  }

  /**
   * @method _requireRunning
   * @description Throw if the context instance is not in the RUN state
   *
   * @param {Object} ctx context object
   */
  _requireRunning(ctx) {
    this._requireInstance(ctx);
    if( ctx.instance.state !== config.pgInstance.states.RUN ) {
      throw new Error('Instance must be in RUN state to change the public user: '+
        ctx.instance.name+' is '+ctx.instance.state);
    }
  }

}

const publicUser = new PublicUser();
export default publicUser;
