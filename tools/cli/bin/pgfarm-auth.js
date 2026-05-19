import {Command} from 'commander';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import auth from '../lib/auth.js';
import colors from 'colors';
import {config, getParsedToken, isLoggedIn, isAdmin} from '../lib/config.js';
import serviceAccountModel from '../../lib/models/ServiceAccountModel.js';
import print from '../lib/print.js';
const program = new Command();

/**
 * @function confirmRotate
 * @description Prints a strongly-worded warning and prompts the user to type 'yes' to continue.
 * Resolves false (and exits) on anything else.
 *
 * @param {string} username - service account being rotated
 * @returns {Promise<boolean>}
 */
function confirmRotate(username) {
  console.log();
  console.log(colors.bgRed.white.bold('  ⚠️   WARNING — DESTRUCTIVE ACTION   ⚠️  '));
  console.log(colors.red('╔══════════════════════════════════════════════════════════════╗'));
  console.log(colors.red('║') + colors.yellow.bold('  🔴  THE CURRENT SECRET WILL STOP WORKING IMMEDIATELY.       ') + colors.red('║'));
  console.log(colors.red('║') + colors.yellow('  Any application or script using the existing secret will    ') + colors.red('║'));
  console.log(colors.red('║') + colors.yellow('  lose database access the moment rotation completes.         ') + colors.red('║'));
  console.log(colors.red('║') + colors.yellow('  There is NO way to recover the old secret after rotation.  ') + colors.red('║'));
  console.log(colors.red('╠══════════════════════════════════════════════════════════════╣'));
  console.log(colors.red('║') + colors.green.bold('  ✅  RECOMMENDED: get a fresh token BEFORE rotating.          ') + colors.red('║'));
  console.log(colors.red('║') + colors.green('  Use your current secret to request a new token now.         ') + colors.red('║'));
  console.log(colors.red('║') + colors.green('  A valid token continues working for up to 7 days, giving    ') + colors.red('║'));
  console.log(colors.red('║') + colors.green('  you time to deploy the new secret without downtime.         ') + colors.red('║'));
  console.log(colors.red('╚══════════════════════════════════════════════════════════════╝'));
  console.log();
  console.log(`  Account : ${colors.cyan(username)}`);
  console.log();

  return new Promise(resolve => {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    rl.question(colors.bold('  Type "yes" to rotate the secret, anything else to cancel: '), answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

let stdin = '';

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

if( isAdmin() ) {
  program.command('service-account-create <name>')
    .description('Create a new service account. No secret is generated at creation — the account owner must run service-account-rotate to obtain their initial secret.')
    .requiredOption('-p, --parent <username>', 'Parent user who owns this service account')
    .requiredOption('-d, --description <text>', 'Description of the service account\'s purpose')
    .action(async (name, opts) => {
      let resp = await serviceAccountModel.create(name, opts.parent, opts.description);

      if( resp.error ) {
        print.display(resp);
        process.exit(1);
      }

      console.log(colors.green('Service account created'));
      console.log(`Username : ${resp.payload.username}`);
      console.log(colors.cyan(`Run 'pgfarm auth service-account-rotate ${resp.payload.username}' to generate the initial secret.`));
      process.exit(0);
    });
}

if( isLoggedIn() ) {
  program.command('service-account-rotate <name>')
    .description('Rotate the secret for a service account you own. The current secret is invalidated immediately.')
    .option('-s, --save <path>', 'Write the new credentials to a JSON file at this path instead of printing to stdout')
    .action(async (name, opts) => {
      const username = name.endsWith('-service-account') ? name : name + '-service-account';

      const confirmed = await confirmRotate(username);
      if( !confirmed ) {
        console.log(colors.yellow('Rotation cancelled.'));
        process.exit(0);
      }

      let resp = await serviceAccountModel.rotatePassword(name);

      if( resp.error ) {
        print.display(resp);
        process.exit(1);
      }

      const { username: u, secret } = resp.payload;

      if( opts.save ) {
        const savePath = path.resolve(opts.save);
        fs.writeFileSync(savePath, JSON.stringify({username: u, secret}, null, 2));
        console.log(colors.green(`Secret saved to ${savePath}`));
        console.log(colors.yellow('Restrict permissions:') + `  chmod 600 ${savePath}`);
      } else {
        console.log(colors.green('Secret rotated successfully.'));
        console.log(`Username : ${u}`);
        console.log(colors.yellow('Secret (save this now, it will not be shown again):'));
        console.log(secret);
      }
      process.exit(0);
    });
}

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