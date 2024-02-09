import {Command} from 'commander';
import database from '../lib/database.js';

const program = new Command();

program.command('create')
  .description('Create a new instance PG Farm database (requires admin access)')
  .option('-i, --instance <title>', 'Instance to use.  Will be created if it does not exist')
  .requiredOption('-d, --database <title>', 'Database title')
  .option('-o, --organization <title>', 'Organization title. Will be created if it does not exist')
  .action(options => {
    database.create(options);
  });

program.command('add-user <org/database> <user>')
  .description('Add a user to an database (requires admin access to instance)')
  .action((dbName, user) => {
    database.addUser(dbName, user);
  });

program.command('list')
  .description('List databases')
  .option('-m, --mine', 'List only databases I have an account on')
  .option('-i, --id', 'Include instance id in output')
  .action(opts => {
    database.list(opts.mine, opts.id);
  });

program.command('restart-api <org/database>')
  .description('Restart the PostgREST API for an instance (requires admin access)')
  .action(dbName => {
    database.restartApi(dbName);
  });

program.parse(process.argv);