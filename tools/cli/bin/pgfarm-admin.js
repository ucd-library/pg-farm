import {Option, program} from 'commander';
import {wrapAllCmds} from '../lib/global-opts.js';
import print from '../lib/print.js';
import adminModel from '../../lib/models/AdminModel.js';

program.command('connections')
  .description('Show connection status')
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

wrapAllCmds(program);
program.parse(process.argv);