import path from 'path';
import fs from 'fs/promises';
import exec from '../lib/exec.js';
import client from '../lib/pg-admin-client.js';
import logger from '../lib/logger.js';
import config from '../lib/config.js';
import utils from './utils.js';
import remoteExec from '../lib/pg-helper-remote-exec.js';

class BackupModel {

  getBackupFile(hostname, database) {
    return `/backups/${hostname}/${database}.backup`;
  }

  getRolesFile(hostname) {
    return `/backups/${hostname}/roles.sql`;
  }

  async dumpRoles(hostname) {
    let file = this.getRolesFile(hostname);
    logger.info(`Backing up roles for ${hostname} to ${file}`);
    
    
    let dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });

    return exec(`pg_dumpall --roles-only -U postgres > ${file}`)
  }

  async restoreRoles(hostname) {
    let file = this.getRolesFile(hostname);
    logger.info(`Restoring roles for ${hostname} from ${file}`);
    return exec(`psql -U postgres -f ${file}`);
  }

  async runPgDump(hostname, database) {
    let file = this.getBackupFile(hostname, database);
    logger.info(`Backing up ${hostname} ${database} to ${file}`);
    let dir = path.dirname(file);

    await fs.mkdir(dir, { recursive: true });

    return exec(`pg_dump -U postgres -Fc ${database} > ${file}`);
  }

  async runPgRestore(hostname, database) {
    let file = this.getBackupFile(hostname, database);

    logger.info(`Restoring up ${hostname} ${database} from ${file}`);

    // if the database is not postgres, we need to create it first
    let flags = [];
    if( database !== 'postgres' ) {
      flags.push('--create');
    }
    flags = flags.join(' ');

    return exec(`pg_restore --clean ${flags} --if-exists -U postgres -d postgres ${file}`);
  }

  /**
   * @method remoteBackupAll
   * @description Backs up all databases for all instances.  This is a remote operation
   * calling the helper container to perform the backup for each instance.  It does not
   * wait for the backup to complete, just sends the request to the instance to start the
   * backup.  This only backups up running instances.
   */
  async remoteBackupAll() {
    let instances = await client.getInstances();
    for( let instance of instances ) {
      if( instance.state !== 'RUN' ) continue;

      logger.info(`Starting backup for instance ${instance.hostname}`);

      remoteExec(instance.hostname, '/backup');
    }
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
    let databases = await client.getInstanceDatabases(instNameOrId, orgNameOrId);
    let hostname = databases[0].instance_hostname;
    databases = databases.map(db => db.database_name);

    if( !databases.includes('postgres') ) {
      databases.push('postgres');
    }

    await this.dumpRoles(hostname);

    logger.info(`Backing up databases from host ${hostname}:`, databases);

    for( let database of databases ) {
      await this.runPgDump(hostname, database);
    }

    return {
      hostname,
      databases
    }
  }

  /**
   * @method restore
   * @description Backs up all databases for a given instance in an organization
   * 
   * @param {String} instNameOrId instance id or name
   * @param {String} orgNameOrId organization name or id
   */
  async restore(instNameOrId, orgNameOrId) {
    logger.info(`Restoring databases for instance ${instNameOrId} in org ${orgNameOrId}`);

    // TODO: Check if instance is in ARCHIVE state however, we need to turn on the instance
    
    let instance = await client.getInstance(instNameOrId, orgNameOrId);
    if( instance.state !== 'RESTORING' ) {
      throw new Error('Instance must be RESTORING state to restore databases', instance);
    }

    await this.models.instance.start(instNameOrId, orgNameOrId, {isRestoring: true});

    let databases = await client.getInstanceDatabases(instNameOrId, orgNameOrId);
    let hostname = databases[0].instance_hostname;
    databases = databases.map(db => db.database_name);

    logger.info(`Restoring up databases from host ${hostname}:`, databases);

    if( databases.includes('postgres') ) {
      databases.splice(databases.indexOf('postgres'), 1);
    }

    // First, restore the roles
    await this.restoreRoles(hostname);

    // Then, restore the postgres database
    await this.runPgRestore(hostname, 'postgres');

    // Finally, restore the other databases
    for( let database of databases ) {
      await this.runPgRestore(hostname, database);
    }

    let startResp = await this.models.admin.startInstance(instNameOrId, orgNameOrId);
    if( startResp.starting ) {
      await startResp.instance;
      await startResp.pgrest;
    }
  }

  async archive(instNameOrId, orgNameOrId) {
    logger.info(`Archiving databases for instance ${instNameOrId} in org ${orgNameOrId}`);

    let instance = await client.getInstance(instNameOrId, orgNameOrId);
    if( instance.state !== 'RUN' ) {
      throw new Error('Instance must be in RUN state to archive databases', instance);
    }

    let STATES = this.models.instance.STATES;
    await this.models.instance.setInstanceState(instNameOrId, orgNameOrId, STATES.ARCHIVING);

    // first kill the pg rest services
    let dbs = await client.getInstanceDatabases(instNameOrId, orgNameOrId)
    for( let db of dbs ) {
      await this.models.pgRest.stop(db.database_id, orgNameOrId);
    }

    let resp = await this.backup(instNameOrId, orgNameOrId);
    logger.info('Archived instance, await for files to sync', instNameOrId, orgNameOrId);
    for( let database of resp.databases ) {
      let local = this.getBackupFile(resp.hostname, database);
      let remote = `gs://${config.backup.bucket}/${resp.hostname}/${database}.backup`;

      await utils.awaitForGsFuseSync(local, remote);
      logger.info('GCS filesync validated', local, remote);
    }

    await this.models.instance.stop(instNameOrId, orgNameOrId, {isArchived: true});

    // TODO: should this be a manual process?
    // logger.warn(`removing k8s pvc ${resp.hostname}-ps-${resp.hostname}-0`);
    // await exec(`kubectl delete pvc ${resp.hostname}-ps-${resp.hostname}-0`);
  }

}

const inst = new BackupModel();
export default inst;