#! /usr/bin/env node

import {Command} from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const program = new Command();
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
);

program
  .name('pgfarm-admin')
  .version(pkg.version)
  .command('database', 'view/manage databases')
  .command('instance', 'view/manage postgres instances')
  .command('organization', 'manage organizations')
  .command('auth', 'log in/out of PG Farm')
  .command('config', 'setup cli');
  
program
  .command('admin-db-shell')
  .description('Connect to a PG Farm database as an admin user.  returns kubectl shell command')
  .action(() => {
    console.log('kubectl exec --stdin --tty admin-db-0 -c admin-db -- psql -U postgres');
  });


program.parse(process.argv);