import exec from '../../../lib/exec.js'

class BackupModel {

  backup(instance) {
    return exec(`pg_dump -Fc ${instance} > /tmp/${instance}.backup`);
  }
}