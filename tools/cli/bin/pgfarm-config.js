import {Command} from 'commander';
import {config, save, getParsedToken} from '../lib/config.js';
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

    let payload = getParsedToken();

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
      let username = payload.username || payload.preferred_username;

      console.log('username                   : '+(username));
      console.log(`Password Token Expires           : ${payload.expires.toLocaleDateString()} ${payload.toLocaleTimeString()} (${payload.expiresDays} days from now)`);

      if( expires.getTime() < Date.now() ) {
        console.log('\n *** Token has expired! ***\n');
        console.log('You can login again using:\n');
        console.log('pgfarm auth login');
      } else {
        console.log(`\nFor help with connecting to your databases, use:
pgfarm connect --help`);
      }
    } else {
      console.log('You are not logged in.  You can login using:\n');
      console.log('pgfarm auth login');
    }

    console.log('');
  });

program.parse(process.argv);