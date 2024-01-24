import {Command} from 'commander';
import {config, save} from '../lib/config.js';
const program = new Command();

program.command('set <key> <value>')
  .description('set a config value')
  .action((key, value) => {
    config[key] = value;
    save();
  });

program.command('show')
  .alias('list')
  .option('-n, --name <key>', 'show a specific config value')
  .description('show current config')
  .action(options => {
    if(options.name) {
      if( options.name === 'token' ) {
        console.log(config.tokenHash);
        return;
      }
      if( options.name === 'jwt' ) {
        console.log(config.token);
        return;
      }

      console.log(config[options.name]);
      return;
    }

    let payload = config.token ? config.token.split('.')[1] : null;
    if( payload ) {
      payload = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    }

    console.log('Current Config:\n');
    for(let key in config) {
      if( key === 'token' ) continue;
      if( key === 'tokenHash' ) {
        console.log(`token (temporary password) : ${config[key]}`);
        continue;
      }
      let keySpaced = key;
      while( keySpaced.length < 27 ) keySpaced += ' ';
      console.log(`${keySpaced}: ${config[key]}`);
    }

    if( payload ) {
      let expires = new Date(payload.exp * 1000);
      let expiresDays = ((expires.getTime() - Date.now()) / (1000*60*60*24)).toFixed(1);
      let username = payload.username || payload.preferred_username;

      console.log('username                   : '+(username));
      console.log(`Password Expires           : ${expires.toLocaleDateString()} ${expires.toLocaleTimeString()} (${expiresDays} days from now)`);

      if( expires.getTime() < Date.now() ) {
        console.log('\n *** Token has expired! ***\n');
        console.log('You can login again using:\n');
        console.log('pgfarm auth login');
      } else {
        console.log(`\n===============================================
You can connect to your PG FARM Database using:\n
psql -U ${username} -h ${new URL(config.host).hostname} [database]

or use the PGSERVICE environment variable:

PGSERVICE=pgfarm psql [database]
`);
      }
    } else {
      console.log('You are not logged in.  You can login using:\n');
      console.log('pgfarm auth login');
    }

    console.log('');
  });

program.parse(process.argv);