const program = require('commander');
const defaultOpts = require('../lib/defaults-opts');
const model = require('../../node-lib/models/cluster');

const CLUSTER_TYPES = ['streaming', 'snapshot'];

defaultOpts
  .wrap(program)
  .arguments('<name>')
  .option('-t --type <type>', 'Cluster type: '+CLUSTER_TYPES.join(', '))
  .option('-s --pgr-schema <schema>', 'Schema for PGR to use. Defaults to public.')
  .option('-d --pgr-database <database>', 'Database for PGR to use. Defaults to postgres.')
  .option('-u --pgr-user <username>', 'Connection user for PGR to use. Defaults to postgres.')
  .option('-p --pgr-password <password>', 'Connection password for PGR to use. Defaults to library_user.')
  .option('-a --pgr-anon-user <anon>', 'Anonymous user for PGR to use. Defaults to library_user.')
  .option('-k --server-key <path>', 'Path to server SSL key. If not provided generic cert will be generated')
  .option('-a --server-crt <path>', 'Path to server SSL cert. If not provided generic cert will be generated')
  .action(action)
  .parse(process.argv);

async function action(name, args) {
  try {
    let resp = await model.create({
      name,
      type : args.type,
      pgrSchema : args.pgrSchema,
      pgrDatabase : args.pgrDatabase,
      pgrUser : args.pgrUser,
      pgrPassword : args.pgrPassword,
      pgrAnonUser : args.pgrAnonUser
    });

    if( resp.SSL_CERT_TYPE === 'self-signed' ) {
      console.log(`
*WARNING: SSL crt and key path not provided.  Self signed cert used for now.
`);
    }

    console.log(resp);
  } catch(e) {
    console.error(e.message);
  }
}

if( !program.args.length ) {
  program.outputHelp();
}