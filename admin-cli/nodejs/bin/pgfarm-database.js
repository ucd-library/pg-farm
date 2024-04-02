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

program.command('list')
  .description('List databases')
  .option('-m, --mine', 'List only databases I have an account on')
  .option('-j, --json', 'Raw json output')
  .action(opts => {
    database.list(opts);
  });

program.command('restart-api <org/database>')
  .description('Restart the PostgREST API for an instance (requires admin access)')
  .action(dbName => {
    database.restartApi(dbName);
  });

program.command('init <org/database>')
  .description('Rerun the pgfarm init scripts for database (requires admin access)')
  .action(dbName => {
    database.init(dbName);
  });

program.command('link <org/database> <remoteOrg/remoteDatabase>')
  .description('Link a remote database to a local database using foreign data wrappers')
  .action((dbName, remoteDbName) => {
    database.link(dbName, remoteDbName);
  });

program.command('grant', 'Helper methods for granting user access to a schema or table');

program.parse(process.argv);