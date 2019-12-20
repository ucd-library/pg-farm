const program = require('commander');
 
program
  .version(require('../package').version)
  .command('dc <name>', 'run docker-compose commands on a pg-farm cluster')
  .command('init-cluster', 'setup a pg-farm docker-compose cluster')
  .parse(process.argv);