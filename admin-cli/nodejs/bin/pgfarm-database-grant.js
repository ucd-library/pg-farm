import {Command} from 'commander';
import database from '../lib/database.js';

const program = new Command();

program.command('schema <org/database> <schema> <username> <grant-type>')
  .description('Grant access to all tables in schema user.  Grant type is one of: SELECT or ALL')
  .action((dbName, schema, username, grantType, options) => {
    database.grant(dbName, schema, username, grantType, options);
  });

program.command('table <org/database> <schema.table> <username> <grant-type>')
  .description('Grant table access to a user.  Grant type is one of: SELECT or ALL')
  .action((dbName, schemaTable, username, grantType, options) => {
    database.grant(dbName, schemaTable, username, grantType, options);
  });

program.parse(process.argv);