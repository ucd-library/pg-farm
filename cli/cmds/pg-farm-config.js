const program = require('commander');
 
program
  .command('list', 'show the current config')
  .parse(process.argv);