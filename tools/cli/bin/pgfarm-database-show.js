import {Command} from 'commander';
import database from '../lib/database.js';
import {wrapAllCmds} from '../lib/global-opts.js';
import print from '../lib/print.js';

const program = new Command();

program.name('pgfarm database show '+print.dbAdminOnlyMsg())
  .description('Helper methods viewings users, schemas, and tables in a database')


program.command('users <org/database>')
  .description('Show users with access to a database')
  .action((dbName, opts, cmd) => {
    database.showUsers(dbName, cmd.optsWithGlobals());
  });

program.command('schemas <org/database>')
  .description('Show schemas in a database')
  .action((dbName, opts, cmd) => {
    database.showSchemas(dbName, cmd.optsWithGlobals());
  });

program.command('tables <org/database> <schema>')
  .description('Show tables in a schema')
  .action((dbName, schemaName, opts, cmd) => {
    database.showTables(dbName, schemaName, cmd.optsWithGlobals());
  });

program.command('user-access <org/database> <schema> <user>')
  .description('Show tables in a schema')
  .action((dbName, schemaName, username, opts, cmd) => {
    database.showSchemaUserAccess(dbName, schemaName, username, cmd.optsWithGlobals());
  });

wrapAllCmds(program);
program.parse(process.argv);