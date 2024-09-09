#! /usr/bin/env node

import {Command} from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const program = new Command();
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf-8')
);

program
  .name('pgfarm')
  // .option('-V, --version', 'show version')
  .action(() => {
    console.log(`
██████╗  ██████╗ ███████╗ █████╗ ██████╗ ███╗   ███╗
██╔══██╗██╔════╝ ██╔════╝██╔══██╗██╔══██╗████╗ ████║
██████╔╝██║  ███╗█████╗  ███████║██████╔╝██╔████╔██║
██╔═══╝ ██║   ██║██╔══╝  ██╔══██║██╔══██╗██║╚██╔╝██║
██║     ╚██████╔╝██║     ██║  ██║██║  ██║██║ ╚═╝ ██║
╚═╝      ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
                                                    
Version: ${pkg.version}
Commands: pgfarm --help
Homepage: https://pgfarm.library.ucdavis.edu

`);
  })
  .command('auth', 'Log in/out of PG Farm')
  .command('config', 'Setup cli')
  .command('connect', 'Show various connection examples')
  .command('database', 'View, find and manage databases')
  .command('instance', 'View and manage postgres instances')
  .command('organization', 'View and manage organizations')

  

  


program.parse(process.argv);