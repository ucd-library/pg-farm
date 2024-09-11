import {Command} from 'commander';
import instance from '../lib/instance.js';
import {wrapAllCmds} from '../lib/global-opts.js';
import print from '../lib/print.js';

const program = new Command();

program.command('list')
  .description('List all postgres instances')
  .option('-g, --organization <name>', 'Filter by organization')
  .option('-s, --state <state>', 'Filter by instance state')
  .option('-l, --limit <limit>', 'Limit the number of results. Default is 10')
  .option('-f, --offset <offset>', 'Offset the results. Default is 0')
  .action((opts) => {
    instance.list(opts);
  });

program.command('get <org/instance>')
  .description('Get details for a postgres instance')
  .action((instanceName, opts) => {
    instance.get(instanceName, opts);
  });

program.command('add-user <org/instance> <user>')
  .description('Add a user to an database '+print.dbAdminOnlyMsg())
  .option('-a, --admin', 'Grant admin privileges to the user')
  .option('-s, --service-account', 'User is a service account')
  .option('-p, --parent <parent>', 'Parent user for service account')
  .action((instanceName, user, opts) => {
    instance.addUser(instanceName, user, opts);
  });

program.command('start <org/instance>')
  .description('Manually start an postgres instance '+print.dbAdminOnlyMsg())
  .option('-f, --force', 'Force start the instance. This will reapply k8s config.')
  .action((instanceName, opts, cmd) => {
    instance.start(instanceName, cmd.optsWithGlobals());
  });

program.command('restart <org/instance>')
  .description('Manually restart an postgres instance '+print.dbAdminOnlyMsg())
  .action((instanceName, opts) => {
    instance.restart(instanceName, opts);
  });

program.command('stop <org/instance>')
  .description('Manually stop an postgres instance '+print.dbAdminOnlyMsg())
  // .option('-f, --force', 'Force stop the instance.  Required for ALWAYS availability instances.')
  .action((instanceName, opts) => {
    instance.stop(instanceName, opts);
  });

program.command('create')
  .description('Create a new instance PG Farm postgres instance '+print.pgFarmAdminOnlyMsg())
  .requiredOption('-n, --name <name>', 'Instance name')
  .requiredOption('-g, --organization <name>', 'Instance organization name')
  .option('-a, --availability <availability>', 'Availability of the instance (ALWAYS, HIGH, MEDIUM, LOW)')
  .action(options => {
    instance.create(options);
  });

program.command('backup <org/instance>')
  .description('Backup postgres instance '+print.pgFarmAdminOnlyMsg())
  .action(instanceName => {
    instance.backup(instanceName);
  });

program.command('archive <org/instance>')
  .description('Archive postgres instance '+print.pgFarmAdminOnlyMsg())
  .action(instanceName => {
    instance.archive(instanceName);
  });

program.command('restore <org/instance>')
  .description('Restore postgres instance from archive '+print.pgFarmAdminOnlyMsg())
  .action(instanceName => {
    instance.restore(instanceName);
  });

program.command('resize <org/instance> <size>')
  .description('Increase size postgres volume.  Size in GB '+print.pgFarmAdminOnlyMsg())
  .action((instanceName, size) => {
    instance.resize(instanceName, size);
  });


program.command('sync-users <org/instance>')
  .description('Sync postgres instance users '+print.pgFarmAdminOnlyMsg())
  .action(instanceName => {
    instance.syncUsers(instanceName);
  });


wrapAllCmds(program);
program.parse(process.argv);