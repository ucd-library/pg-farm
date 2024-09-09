import {Command} from 'commander';
import instance from '../lib/instance.js';
import globalOpts from '../lib/global-opts.js';

const program = new Command();

globalOpts(program);

program
  .configureHelp({ showGlobalOptions: true })
  .option('-o, --output <format>', 'Output format (json, yaml, quiet). Default is custom text or yaml depending on the commad')

program.command('create')
  .description('Create a new instance PG Farm postgres instance (admin only)')
  .requiredOption('-n, --name <name>', 'Instance name')
  .requiredOption('-o, --organization <name>', 'Instance organization name')
  .option('-a, --availability <availability>', 'Availability of the instance (ALWAYS, HIGH, MEDIUM, LOW)')
  .action(options => {
    instance.create(options);
  });

program.command('add-user <org/instance> <user>')
  .description('Add a user to an database (instance admin only)')
  .option('-a, --admin', 'Grant admin privileges to the user')
  .option('-s, --service-account', 'User is a service account')
  .option('-p, --parent <parent>', 'Parent user for service account')
  .action((instanceName, user, opts) => {
    instance.addUser(instanceName, user, opts);
  });

program.command('start <org/instance>')
  .description('Manually start an postgres instance (admin only)')
  .option('-f, --force', 'Force start the instance. This will reapply k8s config.')
  .action((instanceName, opts, cmd) => {
    instance.start(instanceName, cmd.optsWithGlobals());
  });

program.command('restart <org/instance>')
  .description('Manually restart an postgres instance (admin only)')
  .action((instanceName) => {
    instance.restart(instanceName);
  });

program.command('stop <org/instance>')
  .description('Manually stop an postgres instance (admin only)')
  .option('-f, --force', 'Force stop the instance.  Required for ALWAYS availability instances.')
  .action(instanceName => {
    instance.stop(instanceName);
  });

program.command('backup <org/instance>')
  .description('Backup postgres instance (admin only)')
  .action(instanceName => {
    instance.backup(instanceName);
  });

program.command('archive <org/instance>')
  .description('Archive postgres instance (admin only)')
  .action(instanceName => {
    instance.archive(instanceName);
  });

program.command('restore <org/instance>')
  .description('Restore postgres instance from archive (admin only)')
  .action(instanceName => {
    instance.restore(instanceName);
  });

program.command('resize <org/instance> <size>')
  .description('Increase size postgres volume.  Size in GB (admin only)')
  .action((instanceName, size) => {
    instance.resize(instanceName, size);
  });


program.command('sync-users <org/instance>')
  .description('Sync postgres instance user (admin only)')
  .action(instanceName => {
    instance.syncUsers(instanceName);
  });

  program.parse(process.argv);