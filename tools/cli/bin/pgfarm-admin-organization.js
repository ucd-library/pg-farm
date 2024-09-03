import {Command} from 'commander';
import organization from '../lib/organization.js';

const program = new Command();

program.command('create')
  .description('Create a new instance PG Farm organization (admin only)')
  .requiredOption('-n, --name <name>', 'Organization name')
  .option('-t, --title <title>', 'Nice human readable title for the organization')
  .option('-d, --description <description>', 'Description of the organization')
  .option('-u, --url <url>', 'URL for the organization')
  .action(options => {
    organization.create(options);
  });

program.command('add-user <org> <user> <role>')
  .description('Add a user to an organization (admin only)')
  .action((org, user, role) => {
    organization.setUserRole(org, user, role);
  });

program.command('set-metadata <org>')
  .description('Set metadata for an organization')
  .option('-t, --title <title>', 'Nice human readable title for the organization')
  .option('-d, --description <description>', 'Description of the organization')
  .option('-u, --url <url>', 'URL for the organization')
  .action((org, opts) => {
    organization.setMetadata(org, opts);
  });

program.parse(process.argv);