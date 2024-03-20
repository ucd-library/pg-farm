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
  .description('Manually start an postgres instance (requires admin access to instance)')
  .option('-f, --force', 'Force start the instance. This will reapply k8s config.')
  .action((instanceName, opts) => {
    instance.start(instanceName, opts);
  });

program.command('stop <instance>')
  .description('Manually stop an postgres instance (requires admin access to instance)')
  .option('-f, --force', 'Force stop the instance.  Required for ALWAYS availability instances.')
  .action(instanceName => {
    instance.stop(instanceName);
  });

program.command('backup <instance>')
  .description('Backup postgres instance (requires admin access to instance)')
  .action(instanceName => {
    instance.backup(instanceName);
  });

program.parse(process.argv);