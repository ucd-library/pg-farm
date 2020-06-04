const program = require('commander');
const defaultOpts = require('../lib/defaults-opts');
const model = require('../../node-lib/models/cluster');

const CLUSTER_TYPES = ['streaming', 'snapshot'];
const VERSIONS = [9.6, 10, 11, 12];

defaultOpts
  .wrap(program)
  .arguments('<name>')
  .option('-t --type <type>', 'Cluster type: '+CLUSTER_TYPES.join(', '))
  .option('-g --pg-version <version>', 'PostgreSQL version: '+VERSIONS.join(', '))
  .option('-s --pgr-schema <schema>', 'Schema for PGR to use. Defaults to public.')
  .option('-d --pgr-database <database>', 'Database for PGR to use. Defaults to postgres.')
  // TODO: we need to support updated the pg_hba.conf file before we can do this... and it's kinda a antipattern
  // .option('-u --pgr-user <username>', 'Connection user for PGR to use. Defaults to postgres.')
  // .option('-p --pgr-password <password>', 'Connection password for PGR to use. Defaults to library_user.')
  // .option('-a --pgr-anon-user <anon>', 'Anonymous user for PGR to use. Defaults to library_user.')
  .option('-k --server-key <path>', 'Path to server SSL key. If not provided generic cert will be generated')
  .option('-a --server-crt <path>', 'Path to server SSL cert. If not provided generic cert will be generated')
  .action(action)
  .parse(process.argv);

async function action(name, args) {
  try {
    let resp = await model.create({
      name,
      type : args.type,
      version : args.pgVersion,
      pgrSchema : args.pgrSchema,
      pgrDatabase : args.pgrDatabase
      // pgrUser : args.pgrUser,
      // pgrPassword : args.pgrPassword,
      // pgrAnonUser : args.pgrAnonUser
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