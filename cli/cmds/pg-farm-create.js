const program = require('commander');
const defaultOpts = require('../lib/defaults-opts');
const model = require('../../node-lib/models/cluster');

const CLUSTER_TYPES = ['streaming', 'snapshot'];

defaultOpts
  .wrap(program)
  .arguments('<name>')
  .option('-t --type <type>', 'Cluster type: '+CLUSTER_TYPES.join(', '))
  .option('-s --schema [schema]', 'Schema for PGR to use. Defaults to public.')
  .option('-d --database [database]', 'Database for PGR to use. Defaults to postgres.')
  .action(action)
  .parse(process.argv);

async function action(name, args) {
  try {
    let resp = await model.create({
      name,
      type : args.type,
      schema : args.schema
    });
    console.log(resp);
  } catch(e) {
    console.error(e.message);
  }
}

if( !program.args.length ) {
  program.outputHelp();
}