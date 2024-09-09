import {Command} from 'commander';
import database from '../lib/database.js';
import globalOpts from '../lib/global-opts.js';

const program = new Command();

globalOpts(program);
program.passThroughOptions()

program.command('get <org/database>')
  .description('Fetch database metadata')
  .action(async (name, opts, cmd) => {
    database.get(name, cmd.optsWithGlobals());
  });

program.command('create')
  .description('Create a new instance PG Farm database (requires admin access)')
  .requiredOption('-d, --database <title>', 'Database title')
  .requiredOption('-g, --organization <title>', 'Organization title. Will be created if it does not exist.  Set to _ for no organization')
  .option('-i, --instance <title>', 'Instance to use.  Will be created if it does not exist. Will default to database name')
  .action((opts, cmd) => {
    database.create(opts, cmd.optsWithGlobals());
  });

program.command('update <org/database>')
  .description('Update metadata for a database')
  .option('-t, --title <title>', 'Title')
  .option('-d, --description <description>', 'Description')
  .option('-s, --short-description <shortDescription>', 'Short description')
  .option('-u, --url <url>', 'URL')
  .option('-l, --tags <tags>', 'Tags (comma separated)')
  .action((dbName, opts, cmd) => {
    if( opts.tags ) {
      opts.tags = opts.tags.split(',').map(t => t.trim());
    }
    database.update(dbName, opts, cmd.optsWithGlobals());
  });

program.command('search')
  .description('search databases')
  .option('-t, --text <text>', 'Free text search')
  .option('-a, --tags <tags>', 'Database tags, comma separated')
  .option('-o, --organization <name>', 'Organization name')
  .option('-l, --limit <limit>', 'Limit the number of results. Default is 10')
  .option('-f, --offset <offset>', 'Offset the results. Default is 0')
  .option('-m, --only-mine', 'Only show databases you are a member of')
  .action((opts, cmd) => {
    database.search(opts, cmd.optsWithGlobals());
  });

program.command('restart-api <org/database>')
  .description('Restart the PostgREST API for an instance (requires admin access)')
  .action((dbName, opts, cmd) => {
    database.restartApi(dbName, cmd.optsWithGlobals());
  });

program.command('init <org/database>')
  .description('Rerun the pgfarm init scripts for database (requires admin access)')
  .action((dbName, opts, cmd) => {
    database.init(dbName, cmd.optsWithGlobals());
  });

program.command('link <org/database> <remoteOrg/remoteDatabase>')
  .description('Link a remote database to a local database using foreign data wrappers')
  .action((dbName, remoteDbName) => {
    database.link(dbName, remoteDbName);
  });

program.command('show', 'Helper methods viewings users, schemas, and tables in a database');

program.command('set-access', 'Helper methods for granting or removing user access to a schema or table');

program.parse();