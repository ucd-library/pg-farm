import {Command} from 'commander';
import database from '../lib/database.js';
import {wrapAllCmds} from '../lib/global-opts.js';
import print from '../lib/print.js';

const program = new Command();

program.command('get <org/database>')
  .description('Fetch database metadata')
  .action(async (name, opts, cmd) => {
    database.get(name, cmd.optsWithGlobals());
  });

program.command('search')
  .description('search databases')
  .option('-t, --text <text>', 'Free text search')
  .option('-a, --tags <tags>', 'Database tags, comma separated')
  .option('-g, --organization <name>', 'Organization name')
  .option('-l, --limit <limit>', 'Limit the number of results. Default is 10')
  .option('-f, --offset <offset>', 'Offset the results. Default is 0')
  .option('-m, --only-mine', 'Only show databases you are a member of')
  .action((opts, cmd) => {
    database.search(opts, cmd.optsWithGlobals());
  });

program.command('link <org/database> <remoteOrg/remoteDatabase>')
  .option('-l, --local-schema <schema>', 'Schema to link to.  Defaults to the remote database name')
  .option('-r, --remote-schema <schema>', 'Schema to link from on the remote server.  Default is: api')
  .description('Link a remote database to a local database using foreign data wrappers '+print.dbAdminOnlyMsg())
  .action((dbName, remoteDbName, opts) => {
    database.link(dbName, remoteDbName, opts);
  });

program.command('show', 'Helper methods viewings users, schemas, and tables in a database '+print.dbAdminOnlyMsg());

program.command('set-access', 'Helper methods for granting or removing user access to a schema or table '+print.dbAdminOnlyMsg());

program.command('update <org/database>')
  .description('Update metadata for a database '+print.dbAdminOnlyMsg())
  .option('-t, --title <title>', 'Title')
  .option('-d, --description <description>', 'Description')
  .option('-s, --short-description <shortDescription>', 'Short description')
  .option('-i, --icon <icon>', 'Icon')
  .option('-b, --brand-color <brandColor>', 'Brand color')
  .option('-u, --url <url>', 'URL')
  .option('-l, --tags <tags>', 'Tags (comma separated)')
  .action((dbName, opts, cmd) => {
    if( opts.tags ) {
      opts.tags = opts.tags.split(',').map(t => t.trim());
    }
    database.update(dbName, opts, cmd.optsWithGlobals());
  });

program.command('expose-table <org/database> <schema.table>')
  .description('Expose a table to the PostgREST API for an database'+print.dbAdminOnlyMsg())
  .action((dbName, table, opts, cmd) => {
    database.exposeTableToApi(dbName, table, cmd.optsWithGlobals());
  });

program.command('update-api-cache <org/database> <schema.table>')
  .description('Update the PostgREST API cache for an database'+print.dbAdminOnlyMsg())
  .action((dbName, opts, cmd) => {
    database.updateApiCache(dbName, cmd.optsWithGlobals());
  });

program.command('restart-api <org/database>')
  .description('Restart the PostgREST API for an database '+print.pgFarmAdminOnlyMsg())
  .action((dbName, opts, cmd) => {
    database.restartApi(dbName, cmd.optsWithGlobals());
  });

program.command('init <org/database>')
  .description('Rerun the pgfarm init scripts for database '+print.pgFarmAdminOnlyMsg())
  .action((dbName, opts, cmd) => {
    database.init(dbName, cmd.optsWithGlobals());
  });

program.command('create')
  .description('Create a new instance PG Farm database '+print.pgFarmAdminOnlyMsg())
  .requiredOption('-d, --database <title>', 'Database title')
  .requiredOption('-g, --organization <title>', 'Organization title. Will be created if it does not exist.  Set to _ for no organization')
  .option('-i, --instance <title>', 'Instance to use.  Will be created if it does not exist. Will default to database name')
  .action((opts, cmd) => {
    database.create(opts, cmd.optsWithGlobals());
  });

program.command('add-featured <org/database>')
  .description('Add a database to the featured list '+print.pgFarmAdminOnlyMsg())
  .option('-i, --order-index <number>', 'Order index')
  .option('-g, --organization-list', "Will add to organization's featured list. If not provided, will add to global featured list")
  .action((dbName, opts, cmd) => {
    database.addFeatured(dbName, cmd.optsWithGlobals());
  });

program.command('remove-featured <org/database>')
  .description('Remove a database from the featured list '+print.pgFarmAdminOnlyMsg())
  .option('-g, --organization-list', "Will remove from organization's featured list. If not provided, will remove from global featured list")
  .action((dbName, opts, cmd) => {
    database.removeFeatured(dbName, cmd.optsWithGlobals());
  });

program.command('get-featured')
  .description('Get a featured database list')
  .argument('[organization]', 'Organization name. If not provided, will return the global featured list')
  .action((orgName, opts, cmd) => {
    database.getFeatured(orgName, cmd.optsWithGlobals());
  });

wrapAllCmds(program);
program.parse(process.argv);
