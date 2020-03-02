const program = require('commander');
 
program
  .command('list', 'show pg image versions')
  .command('show <name>', 'show pg image version for cluster')
  .command('upgrade <name>', 'update pg image version for cluster')
  .parse(process.argv);