import {Command} from 'commander';
import instance from '../lib/instance.js';

const program = new Command();


program.command('create')
  .description('Create a new instance PG Farm instance (requires admin access)')
  .requiredOption('-n, --name <name>', 'Instance name')
  .action(options => {
    instance.create(options);
  });

program.command('add-user <instance> <user>')
  .description('Add a user to an instance (requires admin access to instance)')
  .action((instanceName, user) => {
    instance.addUser(instanceName, user);
  });

program.command('list')
  .description('List instances')
  .option('-m, --mine', 'List only instances I have an account on')
  .option('-i, --id', 'Include instance id in output')
  .action(opts => {
    instance.list(opts.mine, opts.id);
  });

program.command('stop <instance>')
  .description('Stop an instance (requires admin access to instance)')
  .action(instanceName => {
    instance.stop(instanceName);
  });

program.command('restart-api <instance>')
  .description('Restart the PostgREST API for an instance (requires admin access)')
  .action(instanceName => {
    instance.restartApi(instanceName);
  });

program.parse(process.argv);