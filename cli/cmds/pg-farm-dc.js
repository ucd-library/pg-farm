const program = require('commander');
const model = require('../../node-lib/models/cluster');

program
  .arguments('<name>')
  .action((name) => {
    try {
      console.log(model.getDockerComposeCmd(name));
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)

if( !program.args.length ) {
  program.outputHelp();
}