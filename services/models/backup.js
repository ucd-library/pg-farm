import path from 'path';
import fs from 'fs/promises';
import exec from '../lib/exec.js';
import client from '../lib/pg-admin-client.js';
import logger from '../lib/logger.js';

class BackupModel {

  async runPgDump(hostname, database) {
    let file = `/backups/${hostname}/${database}.backup`;
    logger.info(`Backing up ${hostname} ${database} to ${file}`);
    let dir = path.dirname(file);

    await fs.mkdir(dir, { recursive: true });

    return exec(`pg_dump -U postgres -Fc ${database} > ${file}`);
  }

  async runPgRestore(hostname, database) {
    let file = `/backups/${hostname}/${database}.backup`;

    logger.info(`Restoring up ${hostname} ${database} from ${file}`);

    return exec(`pg_restore --clean -U postgres -d ${database} ${file}`);
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
      if( instance.status !== 'RUN' ) continue;

      logger.info(`Starting backup for instance ${instance.hostname}`);

      fetch(
        `http://${instance.hostname}:3000/backup`,
        {method: 'POST'}
      )
      .catch(e => logger.error('Error starting backup for instance', instance, e));
    }
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

    logger.info(`Backing up databases from host ${hostname}:`, databases);

    for( let database of databases ) {
      await this.runPgDump(hostname, database);
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
    let databases = await client.getInstanceDatabases(instNameOrId, orgNameOrId);
    let hostname = databases[0].instance_hostname;
    databases = databases.map(db => db.database_name);

    logger.info(`Restoring up databases from host ${hostname}:`, databases);

    if( databases.includes('postgres') ) {
      databases.splice(databases.indexOf('postgres'), 1);
    }

    // First, restore the postgres database
    await this.runPgRestore(hostname, 'postgres');

    for( let database of databases ) {
      await this.runPgRestore(hostname, database);
    }
  }

}

const inst = new BackupModel();
export default inst;