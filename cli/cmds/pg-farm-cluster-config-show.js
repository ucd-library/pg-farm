const program = require('commander');
const model = require('../../node-lib/models/cluster');

program
  .arguments('<name>')
  .description('Show pg farm cluster .env information')
  .action((name) => {
    try {
      let env = model.getEnv(name);
      for(let key in env) {
        console.log(key, '=', env[key])
      }
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)

if( !program.args.length ) {
  program.outputHelp();
}