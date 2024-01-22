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

program.parse(process.argv);