import {Command} from 'commander';
import database from '../lib/database.js';

const program = new Command();

function test() {
  console.log('test');
}

program
  .configureHelp({ showGlobalOptions: true })
  .option('-o, --output <format>', 'Output format (json, yaml, text). Default is json')

program.command('get <org/database>')
  .description('Fetch database metadata')
  .action(async (name, opts, cmd) => {
    await database.get(name, cmd.optsWithGlobals());
  });

program.command('set-metadata <org/database>')
  .description('Set metadata for a database')
  .option('-t, --title <title>', 'Title')
  .option('-d, --description <description>', 'Description')
  .option('-s, --short-description <shortDescription>', 'Short description')
  .option('-u, --url <url>', 'URL')
  .option('-l, --tags <tags>', 'Tags (comma separated)')
  .action((dbName, opts) => {
    if( opts.tags ) {
      opts.tags = opts.tags.split(',').map(t => t.trim());
    }
    database.setMetadata(dbName, opts);
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

program.parse();