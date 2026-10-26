import path from 'path';
import fs from 'fs/promises';
import exec from '../lib/exec.js';
import client from '../lib/pg-admin-client.js';
import logger from '../lib/logger.js';
import config from '../lib/config.js';
import remoteExec from '../lib/pg-helper-remote-exec.js';
import {createContext} from '../lib/context.js';

class BackupModel {

  /**
   * @method resolveBucket
   * @description Resolve which GCS bucket an organization's backups should be written to.
   * An organization can override the global default bucket, eg to point at a bucket owned
   * by a different GCP project (that project must grant this app's service account IAM
   * access on the bucket).
   *
   * @param {Object} organization organization row, may be null/undefined
   *
   * @returns {String} bucket name
   */
  resolveBucket(organization) {
    return organization?.backup_bucket || config.backup.bucket;
  }

  getRemotePath(hostname, database) {
    return `${hostname}/${database}.backup`;
  }

  getRolesRemotePath(hostname) {
    return `${hostname}/roles.sql`;
  }

  getScratchFile(hostname, database) {
    return path.join(config.backup.scratchDir, hostname, `${database}.backup`);
  }

  getRolesScratchFile(hostname) {
    return path.join(config.backup.scratchDir, hostname, 'roles.sql');
  }

  /**
   * @method withBackupLog
   * @description Wraps a backup/restore/archive operation with a pgfarm.backup_log row, so
   * success/failure/timing is queryable instead of only existing in pod logs.
   *
   * @param {Object} ctx context object, must have ctx.instance.instance_id
   * @param {String} operation 'backup', 'restore', or 'archive'
   * @param {Function} fn async function to run
   *
   * @returns {Promise} resolves/rejects with whatever fn resolves/rejects with
   */
  async withBackupLog(ctx, operation, fn) {
    let logId = await client.startBackupLog(ctx.instance.instance_id, operation);

    try {
      let result = await fn();
      await client.finishBackupLog(logId, 'SUCCESS');
      return result;
    } catch(e) {
      await client.finishBackupLog(logId, 'FAILED', String(e?.message || e));
      throw e;
    }
  }

  /**
   * @method dumpRoles
   * @description Dumps roles for an instance and streams them directly to GCS via gsutil.
   * No local file is written.
   *
   * @param {String} hostname instance hostname
   * @param {String} bucket GCS bucket to write to
   */
  async dumpRoles(hostname, bucket) {
    let remote = `gs://${bucket}/${this.getRolesRemotePath(hostname)}`;
    logger.info(`Backing up roles for ${hostname} to ${remote}`);

    return exec(`pg_dumpall --roles-only -U postgres | gsutil cp - ${remote}`);
  }

  /**
   * @method restoreRoles
   * @description Downloads a roles dump from GCS to the scratch volume and restores it,
   * then deletes the scratch file.
   *
   * @param {String} hostname instance hostname
   * @param {String} bucket GCS bucket to read from
   */
  async restoreRoles(hostname, bucket) {
    let remote = `gs://${bucket}/${this.getRolesRemotePath(hostname)}`;
    let file = this.getRolesScratchFile(hostname);
    logger.info(`Restoring roles for ${hostname} from ${remote}`);

    await fs.mkdir(path.dirname(file), { recursive: true });
    await exec(`gsutil cp ${remote} ${file}`);

    try {
      return await exec(`psql -U postgres -f ${file}`);
    } finally {
      await fs.unlink(file).catch(() => {});
    }
  }

  /**
   * @method runPgDump
   * @description Dumps a single database and streams it directly to GCS via a piped
   * `gsutil cp -`. No local file is ever written, so this doesn't depend on the GCS-FUSE
   * mount's local write buffering, which doesn't scale reliably to large (100s of GB) dumps.
   * gsutil verifies the upload checksum itself and fails loudly on mismatch.
   *
   * @param {String} hostname instance hostname
   * @param {String} database database name
   * @param {String} bucket GCS bucket to write to
   */
  async runPgDump(hostname, database, bucket) {
    let remote = `gs://${bucket}/${this.getRemotePath(hostname, database)}`;
    logger.info(`Backing up ${hostname} ${database} to ${remote}`);

    return exec(`pg_dump -U postgres -Fc ${database} | gsutil cp - ${remote}`);
  }

  /**
   * @method runPgRestore
   * @description Downloads a database dump from GCS to the scratch volume, restores it,
   * then deletes the scratch file. The download goes through the scratch volume (rather than
   * piping straight into pg_restore's stdin) because gsutil's file download is resumable and
   * retried, unlike an unseekable network stream.
   *
   * @param {String} hostname instance hostname
   * @param {String} database database name
   * @param {String} bucket GCS bucket to read from
   */
  async runPgRestore(hostname, database, bucket) {
    let remote = `gs://${bucket}/${this.getRemotePath(hostname, database)}`;
    let file = this.getScratchFile(hostname, database);

    logger.info(`Restoring ${hostname} ${database} from ${remote}`);

    // if the database is not postgres, we need to create it first
    let flags = [];
    if( database !== 'postgres' ) {
      flags.push('--create');
    }
    flags = flags.join(' ');

    await fs.mkdir(path.dirname(file), { recursive: true });
    await exec(`gsutil cp ${remote} ${file}`);

    try {
      return await exec(`pg_restore --clean ${flags} --if-exists -U postgres -d postgres ${file}`);
    } finally {
      await fs.unlink(file).catch(() => {});
    }
  }

  /**
   * @method remoteBackupAll
   * @description Backs up all databases for all running instances.  This is a remote operation
   * calling the helper container to perform the backup for each instance, fanned out
   * concurrently.  Unlike the old fire-and-forget version, each instance's result is awaited
   * and failures are logged individually instead of being invisible.
   *
   * @returns {Promise<Array>} Promise.allSettled results, one per RUN instance
   */
  async remoteBackupAll() {
    let instances = await client.getAllInstances({state: 'RUN'});
    let results = await Promise.allSettled(
      instances.map(async instance => {
        logger.info(`Starting backup for instance ${instance.hostname}`);
        let resp = await remoteExec(instance.hostname, '/backup');
        if( !resp.ok ) {
          throw new Error(`pg-helper backup request failed with status ${resp.status}: ${await resp.text()}`);
        }
      })
    );

    let failures = results.filter(r => r.status === 'rejected');
    if( failures.length ) {
      logger.error(`${failures.length} of ${results.length} instance backups failed`, failures.map(f => f.reason?.message));
    }

    return results;
  }

  async remoteRestore(instNameOrId, orgNameOrId=null) {
    let instance = await client.getInstance(instNameOrId, orgNameOrId);
    if( instance.state !== 'RESTORING' ) {
      throw new Error('Instance must be RESTORING state to restore databases: '+instance.name);
    }

    logger.info(`Rpc request to restore for instance ${instance.hostname}`);
    return remoteExec(instance.hostname, '/restore');
  }

  async remoteArchive(instNameOrId, orgNameOrId=null) {
    let instance = await client.getInstance(instNameOrId, orgNameOrId);
    if( instance.state !== 'RUN' ) {
      throw new Error('Instance must be RUN state to archive databases '+instance.name);
    }

    logger.info(`Rpc request to archive for instance ${instance.hostname}`);
    return remoteExec(instance.hostname, '/archive');
  }

  /**
   * @method backup
   * @description Backs up all databases for a given instance in an organization
   *
   * @param {String} instNameOrId instance id or name
   * @param {String} orgNameOrId organization name or id
   */
  async backup(instNameOrId, orgNameOrId) {
    logger.info(`Backing up databases for instance ${instNameOrId} in org ${orgNameOrId}`);
    let ctx = await createContext({instance: instNameOrId, organization: orgNameOrId});
    let bucket = this.resolveBucket(ctx.organization);

    return this.withBackupLog(ctx, 'backup', async () => {
      let databases = await client.getInstanceDatabases(ctx);
      let hostname = ctx.instance.hostname;
      databases = databases.map(db => db.name);

      if( !databases.includes('postgres') ) {
        databases.push('postgres');
      }

      await this.dumpRoles(hostname, bucket);

      logger.info(`Backing up databases from host ${hostname}:`, databases);

      for( let database of databases ) {
        await this.runPgDump(hostname, database, bucket);
      }

      return {
        hostname,
        databases,
        bucket
      }
    });
  }

  /**
   * @method restore
   * @description Restores all databases for a given instance in an organization
   *
   * @param {String} instNameOrId instance id or name
   * @param {String} orgNameOrId organization name or id
   */
  async restore(instNameOrId, orgNameOrId) {
    logger.info(`Restoring databases for instance ${instNameOrId} in org ${orgNameOrId}`);

    // TODO: Check if instance is in ARCHIVE state however, we need to turn on the instance

    let ctx = await createContext({instance: instNameOrId, organization: orgNameOrId});
    if( ctx.instance.state !== 'RESTORING' ) {
      throw new Error('Instance must be RESTORING state to restore databases', ctx.instance);
    }
    let bucket = this.resolveBucket(ctx.organization);

    return this.withBackupLog(ctx, 'restore', async () => {
      await this.models.instance.start(instNameOrId, orgNameOrId, {isRestoring: true});

      let databases = await client.getInstanceDatabases(ctx);
      let hostname = ctx.instance.hostname;
      databases = databases.map(db => db.name);

      logger.info(`Restoring up databases from host ${hostname}:`, databases);

      if( databases.includes('postgres') ) {
        databases.splice(databases.indexOf('postgres'), 1);
      }

      // First, restore the roles
      await this.restoreRoles(hostname, bucket);

      // Then, restore the postgres database
      await this.runPgRestore(hostname, 'postgres', bucket);

      // Finally, restore the other databases
      for( let database of databases ) {
        await this.runPgRestore(hostname, database, bucket);
      }

      try {
        let startResp = await this.models.admin.startInstance(instNameOrId, orgNameOrId);
        if( startResp.starting ) {
          await startResp.instance;
          await startResp.pgrest;
        }
      } catch(e) {
        logger.error('Error starting instance after restore: ', e);
      }
    });
  }

  async archive(instNameOrId, orgNameOrId) {
    logger.info(`Archiving databases for instance ${instNameOrId} in org ${orgNameOrId}`);

    let ctx = await createContext({instance: instNameOrId, organization: orgNameOrId});
    if( ctx.instance.state !== 'RUN' ) {
      throw new Error('Instance must be in RUN state to archive databases', ctx.instance);
    }

    return this.withBackupLog(ctx, 'archive', async () => {
      let STATES = this.models.instance.STATES;
      await this.models.instance.setInstanceState(instNameOrId, orgNameOrId, STATES.ARCHIVING);

      // first kill the pg rest services
      let dbs = await client.getInstanceDatabases(ctx)
      for( let db of dbs ) {
        await this.models.pgRest.stop(db.database_id, orgNameOrId);
      }

      let resp = await this.backup(instNameOrId, orgNameOrId);
      logger.info('Archived instance, databases synced to GCS', instNameOrId, orgNameOrId, resp.bucket);

      await this.models.instance.stop(instNameOrId, orgNameOrId, {isArchived: true});

      // TODO: should this be a manual process?
      // logger.warn(`removing k8s pvc ${resp.hostname}-ps-${resp.hostname}-0`);
      // await exec(`kubectl delete pvc ${resp.hostname}-ps-${resp.hostname}-0`);
    });
  }

}

const inst = new BackupModel();
export default inst;
