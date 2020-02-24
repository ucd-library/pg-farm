const program = require('commander');
 
program
  .version(require('../../package').version)
  .command('dc <name>', 'get docker-compose command for a pg-farm cluster')
  .command('ls', 'list all pg-farm clusters')
  .command('config', 'show/edit cli config')
  .command('init-cluster', 'setup a pg-farm docker-compose cluster')
  .parse(process.argv);