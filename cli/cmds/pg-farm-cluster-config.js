const program = require('commander');
 
program
  .command('show <name>', 'Show pg farm cluster .env information')
  .command('set <name> <key> <value>', 'update pg cluster .env config')
  .parse(process.argv);