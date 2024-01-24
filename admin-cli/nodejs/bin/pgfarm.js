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
  .name('pgfarm')
  .version(pkg.version)
  .command('instance', 'manage instances, view instances')
  .command('auth', 'log in/out of PG Farm')
  .command('config', 'setup cli');

program.parse(process.argv);