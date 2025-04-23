import {Command} from 'commander';
import auth from '../lib/auth.js';
import colors from 'colors';
import {config, getParsedToken} from '../lib/config.js';
const program = new Command();

let stdin = '';

program.command('login')
  .description('Login using UCD CAS Authentication')
  .option('-h, --headless', 'Login without local browser (ie you are in a pure shell, no Desktop UI), copy and paste token')
  .option('--force-remote-cert', 'Force use of remote certificate instead of system.  Mac/Linux only. Windows will always use this option.')
  .action(options => {
    auth.login(options);
  });

program.command('service-account-login <serviceAccountName>')
  .description('Login using PG Farm service account')
  .option('-f, --file <file>', 'File to read service account secret from')
  .option('-e, --env <envName>', 'Environment variable to read service account secret from')
  .action((name, options) => {
    if( !options.file && !options.env && !stdin ) {
      console.error('You must specify a file or env option');
      process.exit(1);
    }
    if( !options.file && !options.env ) {
      options.secret = stdin;
    }

    auth.loginServiceAccount(name, options);
  });


program.command('logout')
  .description('Logout current user')
  .action(() => {
    auth.logout();
  });

program.command('status')
  .description('Print login status')
  .action(() => {
    let token = getParsedToken();
    if( !token ) {
      console.log(colors.red('Not logged in'));
      return;
    }
    if( token.expires.getTime() > Date.now() ) {
      console.log(colors.green('Logged in as', token.username || token.preferred_username));

      let text = `Password token expires: ${token.expires.toLocaleDateString()} ${token.expires.toLocaleTimeString()} (${token.expiresDays} days from now)`;
      if( token.expiresDays < 1 ) {
        console.log(colors.yellow(text));
      } else {
        console.log(text);
      }
    } else {
      console.log(colors.red('Token has expired.  Run `pgfarm auth login` to login'));
    }
  });

program.command('token')
  .description('Print current users token')
  .option('-j, --jwt', 'Print full JWT token instead of the hash token')
  .action(opts => {
    if( opts.jwt ) {
      console.log(config.token);
      return;
    }
    console.log(config.tokenHash);
  });


program.command('update-service')
  .description('Update local .pg_service.conf file')
  .action(() => {
    auth.updateService();
  });

program.command('whoami')
  .description('Print current user')
  .action(() => {
    let token = getParsedToken();
    if( !token ) {
      console.log('Not logged in');
      return;
    }
    console.log(token.username || token.preferred_username);
  });

if( process.stdin.isTTY ) {
  program.parse(process.argv);
} else {
  process.stdin.on('readable', () => {
    let chunk = this.read();
    if (chunk !== null) {
        stdin += chunk;
    }
  });
  process.stdin.on('end', () => {
    program.parse(process.argv); 
  });
}