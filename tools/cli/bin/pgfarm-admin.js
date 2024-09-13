import {Command, program} from 'commander';
import {wrapAllCmds} from '../lib/global-opts.js';
import print from '../lib/print.js';
import adminModel from '../../lib/models/AdminModel.js';

program.command('connections')
  .description('Show connection status')
  .action(async (opts) => {
    let resp = await adminModel.getConnections();
    print.display(resp.payload, opts.output);
  });

wrapAllCmds(program);
program.parse(process.argv);