import {Option, program} from 'commander';
import {wrapAllCmds} from '../lib/global-opts.js';
import print from '../lib/print.js';
import adminModel from '../../lib/models/AdminModel.js';

program.command('connections')
  .description('Show connections status')
  .option('-u, --username <username>', 'Filter by username')
  .option('-d, --database <org/database>', 'Filter by org/database name')
  .addOption(new Option('-g, --group-by <type>', 'Display connections grouped by type.').choices(['username', 'database']))
  .action(async (opts) => {
    let resp = await adminModel.getConnections();

    if( resp.error ) {
      print.display(resp, opts.output);
      process.exit(1);
    }

    if( opts.groupBy ) {
      let keys = ['username'];
      let values = ['organization_name', 'database_name'];
      if( opts.groupBy === 'database' ) {
        keys = ['organization_name', 'database_name'];
        values = ['username'];
      }

      let grouped = {};
      resp.payload.forEach(row => {
        let key = keys.map(k => row[k]).join('/');
        let value = values.map(k => row[k]).join('/');
        if( !grouped[key] ) grouped[key] = {};
        if( !grouped[key][value] ) grouped[key][value] = 0;
        grouped[key][value]++;
      });
      resp.payload = grouped;
    }

    print.display(resp, opts.output);
    process.exit(0);
  });

program.command('connection-log')
  .description('Show connection status')
  .argument('<sessionId>', 'Session ID')
  .action(async (sessionsId, opts) => {
    let resp = await adminModel.getConnectionLog(sessionsId);

    resp.payload = resp.payload.map(row => {
      delete row.session_id;
      delete row.connection_event_id;
      if( row.message === null ) delete row.message;
      if( row.message ) {
        try {
          row.message = JSON.parse(row.message);
        } catch(e) {
          // do nothing
        }
      }
      return row;
    });

    print.display(resp, opts.output);
    process.exit(0);
  });


program.command('sleep')
  .description('run the cron to sleep instances now')
  .action(async (opts) => {
    let resp = await adminModel.sleep();
    print.display(resp, opts.output);
    process.exit(0);
  });

program.command('update-user-iam-profile')
  .description('Fetches user profile from UCD IAM API and updates the user record in the admin database')
  .argument('<username>', 'UC Davis Kerberos ID')
  .action(async (username, opts) => {
    let resp = await adminModel.updateUcdIamProfile(username);
    print.display(resp, opts.output);
    process.exit(0);
  });

wrapAllCmds(program);
program.parse(process.argv);
