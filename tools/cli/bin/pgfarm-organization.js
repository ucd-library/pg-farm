import {Command} from 'commander';
import organization from '../lib/organization.js';
import print from '../lib/print.js';
import {wrapAllCmds} from '../lib/global-opts.js';

const program = new Command();

program.name('pgfarm organization');

program.command('get <org>')
  .description('Show organization metadata')
  .action((org, opts) => {
    organization.get(org, opts);
  });

program.command('users <org>')
  .description('Show organization users')
  .action((org, opts) => {
    organization.getUsers(org, opts);
  });

program.command('update <org>')
  .description('Update metadata for an organization '+print.dbAdminOnlyMsg())
  .option('-t, --title <title>', 'Nice human readable title for the organization')
  .option('-d, --description <description>', 'Description of the organization')
  .option('-u, --url <url>', 'URL for the organization')
  .action((org, opts) => {
    organization.update(org, opts);
  });

program.command('create')
  .description('Create a new PG Farm organization '+print.pgFarmAdminOnlyMsg())
  .requiredOption('-t, --title <title>', 'Required. Nice human readable title for the organization')
  .option('-n, --name <name>', 'Organization name')
  .option('-d, --description <description>', 'Description of the organization')
  .option('-u, --url <url>', 'URL for the organization')
  .action(options => {
    organization.create(options);
  });


wrapAllCmds(program);
program.parse(process.argv);