import {Command} from 'commander';
import database from '../lib/database.js';
import {wrapAllCmds} from '../lib/global-opts.js';
import print from '../lib/print.js';

const program = new Command();

program.name('pgfarm database set-access')
  .description('Helper methods for granting or removing user access to a schema or table '+print.dbAdminOnlyMsg());


program.command('schema <org/database> <schema> <username> <grant-type>')
  .description('Set access for all tables in schema for a user.  Grant type is one of: READ, WRITE, or NONE. NONE will remove access.')
  .action((dbName, schema, username, grantType, options) => {
    database.setSchemaUserAccess(dbName, schema, username, grantType, options);
  });

program.command('table <org/database> <schema.table> <username> <grant-type>')
  .description('Set table access for a user.  Grant type is one of: Grant type is one of: READ, WRITE, or NONE. NONE will remove access.')
  .action((dbName, schemaTable, username, grantType, options) => {
    database.setSchemaUserAccess(dbName, schemaTable, username, grantType, options);
  });

program.command('add-user')
  .description('Add users via "pgfarm instance add-user"')
  .action(() => {
    console.log(`
***
* Use "pgfarm instance add-user" to add users to a database.
***
      
Postgres users are created at the instance level and then granted access to 
databases.  Thus it's important you are aware of the instance you are adding 
users to.  You CAN use a database name as the instance name, if you are not 
sure what the instance name of your database is.      
`);
  });

wrapAllCmds(program);
program.parse(process.argv);