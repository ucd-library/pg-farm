import {Command, program} from 'commander';
import {config} from '../lib/config.js';
import ConnectExamples from '../../../services/lib/connect-examples.js';

const connectExamples = new ConnectExamples();
const ALLOWED_TYPES = connectExamples.getConnectionTypes(true);
const BASE_PATH = `${config.host}/api/query`;

program
  .description('Show various connection examples')
  .argument('<org/database>', 'Organization and database name to connect to')
  .argument('<type>', `Connection type (${ALLOWED_TYPES.join(', ')})`)
  .action(run);

function run(orgDatabase, type) {
  if( !config.token ) {
    console.error('Please login to see connection examples');
    process.exit();
  }

  if( !ALLOWED_TYPES.includes(type) ) {
    console.error('Invalid type: '+type+'. Must be one of: '+ALLOWED_TYPES.join(', '));
    process.exit();
  }

  let username = JSON.parse(atob(config.token.split('.')[1]));
  username = username.username || username.preferred_username;

  let host = new URL(config.host).hostname;
  let port = 5432;

  let obj = {
    user: username,
    host: host,
    port: port,
    database: orgDatabase,
    password: config.tokenHash,
    ssl: true,
    queryPath: BASE_PATH
  };
  connectExamples.setOpts(obj);
  connectExamples.logTemplate(type);
}

program.parse(process.argv);
