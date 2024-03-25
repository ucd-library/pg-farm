import {Command} from 'commander';
import instance from '../lib/instance.js';

const program = new Command();


program.command('create')
  .description('Create a new instance PG Farm postgres instance (requires admin access)')
  .requiredOption('-n, --name <name>', 'Instance name')
  .option('-a, --availability <availability>', 'Availability of the instance (ALWAYS, HIGH, MEDIUM, LOW)')
  .action(options => {
    instance.create(options);
  });

program.command('start <instance>')
  .description('Manually start an postgres instance (admin only)')
  .option('-f, --force', 'Force start the instance. This will reapply k8s config.')
  .action((instanceName, opts) => {
    instance.start(instanceName, opts);
  });

program.command('restart <instance>')
  .description('Manually restart an postgres instance (admin only)')
  .action((instanceName) => {
    instance.restart(instanceName);
  });

program.command('stop <instance>')
  .description('Manually stop an postgres instance (admin only)')
  .option('-f, --force', 'Force stop the instance.  Required for ALWAYS availability instances.')
  .action(instanceName => {
    instance.stop(instanceName);
  });

program.command('backup <instance>')
  .description('Backup postgres instance (admin only)')
  .action(instanceName => {
    instance.backup(instanceName);
  });

program.command('archive <instance>')
  .description('Archive postgres instance (admin only)')
  .action(instanceName => {
    instance.archive(instanceName);
  });

program.command('restore <instance>')
  .description('Restore postgres instance from archive (admin only)')
  .action(instanceName => {
    instance.restore(instanceName);
  });

program.command('sync-users <instance>')
  .description('Sync postgres instance user (admin only)')
  .action(instanceName => {
    instance.syncUsers(instanceName);
  });

  program.parse(process.argv);