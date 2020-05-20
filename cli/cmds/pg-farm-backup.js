const program = require('commander');
const model = require('../../node-lib/models/cluster');
const prompts = require('prompts');

program
  .arguments('<name>')
  .description('Backup pg-farm cluster to AWS S3 bucket.  Run as: eval `pg-farm backup [custer name]`')
  .action(async (name) => {
    try {
      let stop = model.getDockerComposeCmd(name)+' stop pg-repl';
      let restore = model.getDockerComposeCmd(name)+' exec -T controller /scripts/backup.sh';
      let start = model.getDockerComposeCmd(name)+' start pg-repl';

      console.log(`${stop} ; ${restore} ; ${start}`);
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)

if( !program.args.length ) {
  program.outputHelp();
}