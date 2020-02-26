const program = require('commander');
const defaultOpts = require('../lib/defaults-opts');
const model = require('../../node-lib/models/cluster');

const CLUSTER_TYPES = ['streaming', 'snapshot'];

defaultOpts
  .wrap(program)
  .arguments('<name>')
  .option('-t --type <type>', 'Cluster type: '+CLUSTER_TYPES.join(', '))
  .option('-s --schema <schema>', 'Schema for PGR to use. Defaults to public.')
  .option('-d --database <database>', 'Database for PGR to use. Defaults to postgres.')
  .option('-u --pgr-user <username>', 'Connection user for PGR to use. Defaults to postgres.')
  .option('-p --pgr-password <password>', 'Connection password for PGR to use. Defaults to empty.')
  .option('-a --pgr-anon-user <anon>', 'Anonymous user for PGR to use. Defaults to library_user.')
  .action(action)
  .parse(process.argv);

async function action(name, args) {
  try {
    let resp = await model.create({
      name,
      type : args.type,
      schema : args.schema,
      database : args.database,
      pgrUser : args.pgrUser,
      pgrPassword : args.pgrPassword,
      pgrAnonUser : args.pgrAnonUser
    });
    console.log(resp);
  } catch(e) {
    console.error(e.message);
  }
}

if( !program.args.length ) {
  program.outputHelp();
}