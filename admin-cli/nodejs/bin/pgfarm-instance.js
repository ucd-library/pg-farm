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

program.command('stop <instance>')
  .description('Manually stop an postgres instance (requires admin access to instance)')
  .option('-f, --force', 'Force stop the instance.  Required for ALWAYS availability instances.')
  .action(instanceName => {
    instance.stop(instanceName);
  });

program.parse(process.argv);