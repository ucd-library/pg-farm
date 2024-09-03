import {Command} from 'commander';
import auth from '../lib/auth.js';
import {config} from '../lib/config.js';
const program = new Command();

let stdin = '';

program.command('login')
  .description('Login using UCD CAS Authentication')
  .option('-h, --headless', 'Login without local browser (ie you are in a pure shell, no Desktop UI), copy and paste token')
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

program.command('token')
  .description('Print current user token')
  .option('-j, --jwt', 'Print full JWT token instead of the hash token')
  .action(opts => {
    if( opts.jwt ) {
      console.log(config.token);
      return;
    }
    console.log(config.tokenHash);
  });

program.command('logout')
  .description('Logout current user')
  .action(() => {
    auth.logout();
  });

program.command('update-service')
  .description('Update local .pg_service.conf file')
  .action(() => {
    auth.updateService();
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