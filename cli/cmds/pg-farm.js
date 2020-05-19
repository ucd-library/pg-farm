#!/usr/bin/env node

const program = require('commander');
 
program
  .version(require('../../package').version)
  .command('dc <name>', 'get docker-compose command for a pg-farm cluster')
  .command('ls', 'list all pg-farm clusters')
  .command('config', 'show/edit cli config')
  .command('cluster-config', 'configure cluster')
  .command('image-version', 'show/edit docker image versions')
  .command('rotate-keys', 'rotate AWS s3 keys for entire farm')
  .command('create <name>', 'create a pg-farm docker-compose cluster')
  .command('remove <name>', 'remove a pg-farm docker-compose cluster')
  .command('up <name>', 'start a pg-farm docker-compose cluster')
  .command('down <name>', 'stop a pg-farm docker-compose cluster')
  .command('ps <name>', 'show pg-farm docker-compose cluster process status')
  .command('psql <name>', 'Connect to pg-farm docker-compose cluster postgres instance with psql')
  .command('restore <name>', 'restore pg-farm cluster from AWS S3 backup.')
  .parse(process.argv);