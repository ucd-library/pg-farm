import {Command} from 'commander';
import {config, save, getParsedToken} from '../lib/config.js';
import colors from 'colors';
const program = new Command();

const SKIP_CONFIG = ['configFile', 'token', 'loginPath'];
const DEFAULT_HOST = 'https://pgfarm.library.ucdavis.edu';

program.command('set <key> <value>')
  .description('set a config value')
  .action((key, value) => {
    config[key] = value;
    if( key === 'host' && config[key] !== value ) {
      config.token = null;
      config.tokenHash = null;
    }
    save();
  });

program.command('default-host')
  .description(`set the host to the production PG Farm (${DEFAULT_HOST})`)
  .action((key, value) => {
    if( config.host != DEFAULT_HOST ) {
      config.host = DEFAULT_HOST;
      config.token = null;
      config.tokenHash = null;
    }
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

    let payload = getParsedToken();

    console.log('Current Config:\n');
    for(let key in config) {
      if( SKIP_CONFIG.includes(key) ) continue;
      if( key === 'tokenHash' ) {
        if( parseFloat(payload.expiresDays) > 0 ) {
          console.log(`token (temporary password) : ${config[key]}`);
        }
        continue;
      }
      let keySpaced = key;
      while( keySpaced.length < 27 ) keySpaced += ' ';
      console.log(`${keySpaced}: ${config[key]}`);
    }

    if( payload && parseFloat(payload.expiresDays) > 0) {
      let username = payload.username || payload.preferred_username;

      console.log('username                   : '+(username));
      console.log(`Password Token Expires     : ${payload.expires.toLocaleDateString()} ${payload.expires.toLocaleTimeString()} (${payload.expiresDays} days from now)`);

      if( payload.expires.getTime() < Date.now() ) {
        console.log(colors.red('\n *** Token has expired! ***\n'));
        console.log('You can login again using:\n');
        console.log('pgfarm auth login');
      } else {
        console.log(`\nFor help with connecting to your databases, use:
pgfarm connect --help`);
      }
    } else {
      console.log(colors.yellow('\n\nYou are not logged in.'));
      console.log(colors.yellow('Login using: "pgfarm auth login"'));
    }

    console.log('');
  });

program.parse(process.argv);