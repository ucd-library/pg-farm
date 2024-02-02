import exec from '../../lib/exec.js';
import client from '../../lib/pg-admin-client.js';

class BackupModel {

  runPgDump(hostname, database) {
    return exec(`pg_dump -Fc ${database} > /backups/${hostname}/${database}.backup`);
  }

  async backup(instNameOrId) {
    const instance = await client.getInstance(instNameOrId);
    await this.runPgDump(instance.hostname, instance.name);
    await this.runPgDump(instance.hostname, 'postgres');
  }

}