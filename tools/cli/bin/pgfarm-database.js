import {Command} from 'commander';
import database from '../lib/database.js';

const program = new Command();

function test() {
  console.log('test');
}

program
  .configureHelp({ showGlobalOptions: true })
  .option('-o, --output <format>', 'Output format (json, yaml, quiet). Default is custom text or yaml depending on the commad')

program.command('get <org/database>')
  .description('Fetch database metadata')
  .action(async (name, opts, cmd) => {
    await database.get(name, cmd.optsWithGlobals());
  });

program.command('create')
  .description('Create a new instance PG Farm database (requires admin access)')
  .option('-i, --instance <title>', 'Instance to use.  Will be created if it does not exist')
  .requiredOption('-d, --database <title>', 'Database title')
  .option('-o, --organization <title>', 'Organization title. Will be created if it does not exist')
  .action(options => {
    database.create(options);
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

program.parse();