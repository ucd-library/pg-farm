const program = require('commander');
const model = require('../../node-lib/models/cluster');

program
  .arguments('<name>')
  .option('-U --username <username>', 'Defaults to postgres')
  .option('-d --database <database>', 'Defaults to postgres')
  .action((name, args) => {
    try {
      console.log(model.getDockerComposeCmd(name)+` exec pg-repl psql -U ${args.username || 'postgres'} ${args.database || 'postgres'}`);
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)

if( !program.args.length ) {
  program.outputHelp();
}