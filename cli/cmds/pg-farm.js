#!/usr/bin/env node

const program = require('commander');
 
program
  .version(require('../../package').version)
  .command('dc <name>', 'get docker-compose command for a pg-farm cluster')
  .command('ls', 'list all pg-farm clusters')
  .command('config', 'show/edit cli config')
  .command('create <name>', 'create a pg-farm docker-compose cluster')
  .command('destroy <name>', 'destroy a pg-farm docker-compose cluster')
  .command('up <name>', 'start a pg-farm docker-compose cluster')
  .command('down <name>', 'stop a pg-farm docker-compose cluster')
  .command('ps <name>', 'show pg-farm docker-compose cluster process status')
  .command('restore <name>', 'restore pg-farm cluster from AWS S3 backup')
  .parse(process.argv);