#! /usr/bin/env node

import {Command} from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import colors from 'colors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const program = new Command();
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf-8')
);

async function getLatestVersion() {
  let resp = await fetch('https://registry.npmjs.org/@ucd-lib/pgfarm')
  let json = await resp.json();
  return json['dist-tags'].latest;
}

program
  .name('pgfarm')
  // .option('-V, --version', 'show version')
  .action(async () => {

let versionInfo = pkg.version;
try {
  let latest = await getLatestVersion();
  if( latest !== versionInfo ) {
    versionInfo = `${versionInfo} (latest: ${colors.green(latest)}. Run '${colors.yellow(`npm install -g @ucd-lib/pgfarm@${latest}`)}' to update)`;
  } else {
    versionInfo += colors.green(' (latest)');
  }
} catch(e) {}


console.log();
console.log(colors.yellow('██████╗  ██████╗  ')+colors.blue('███████╗ █████╗ ██████╗ ███╗   ███╗'))
console.log(colors.yellow('██╔══██╗██╔════╝  ')+colors.blue('██╔════╝██╔══██╗██╔══██╗████╗ ████║'))
console.log(colors.yellow('██████╔╝██║  ███╗ ')+colors.blue('█████╗  ███████║██████╔╝██╔████╔██║'))
console.log(colors.yellow('██╔═══╝ ██║   ██║ ')+colors.blue('██╔══╝  ██╔══██║██╔══██╗██║╚██╔╝██║'))
console.log(colors.yellow('██║     ╚██████╔╝ ')+colors.blue('██║     ██║  ██║██║  ██║██║ ╚═╝ ██║'))
console.log(colors.yellow('╚═╝      ╚═════╝  ')+colors.blue('╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝'))

console.log(`                                                    
Version: ${versionInfo}
Commands: pgfarm --help
Homepage: https://pgfarm.library.ucdavis.edu

`);
  })
  .command('auth', 'Log in/out of PG Farm.  Show login token')
  .command('config', 'Setup cli')
  .command('connect', 'Show various connection examples')
  .command('database', 'View, find and manage databases')
  .command('instance', 'View and manage postgres instances.  An instance is a running postgres server, can have multiple databases')
  .command('organization', 'View and manage organizations')

  

  


program.parse(process.argv);