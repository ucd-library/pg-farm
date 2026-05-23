import {Command} from 'commander';
import auth from '../lib/auth.js';
import colors from 'colors';
import {config, getParsedToken} from '../lib/config.js';
const program = new Command();

function readStdin() {
  return new Promise((resolve, reject) => {
    let stdin = '';

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => {
      stdin += chunk;
    });
    process.stdin.on('end', () => resolve(stdin));
    process.stdin.on('error', reject);
  });
}

program.command('login')
  .description('Login using UCD CAS Authentication')
  .option('-h, --headless', 'Login without local browser (ie you are in a pure shell, no Desktop UI), copy and paste token')
  .option('--force-system-cert', 'Force use of system certificate instead of remotely pulled pgfarm cert.')
  .action(options => {
    auth.login(options);
  });

program.command('service-account-login <serviceAccountName>')
  .description('Login using PG Farm service account')
  .option('-f, --file <file>', 'File to read service account secret from')
  .option('-e, --env <envName>', 'Environment variable to read service account secret from')
  .action(async (name, options) => {
    if( !options.file && !options.env ) {
      options.secret = await readStdin();
      if( !options.secret ) {
        console.error('You must specify a file or env option');
        process.exit(1);
      }
    }

    await auth.loginServiceAccount(name, options);
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

program.parse(process.argv);