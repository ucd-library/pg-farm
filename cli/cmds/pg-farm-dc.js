const program = require('commander');
const model = require('../../node-lib/models/cluster');

program
  .arguments('<name>')
  .description('get docker-compose command for a pg-farm cluster.  Example usage: $(pg-farm dc ahb-weather) logs -f')
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