const program = require('commander');
const model = require('../../node-lib/models/cluster');

program
  .arguments('<name>')
  .option('-v --image-version <version>', 'PG Farm image version to set for cluster')
  .action(async (name, args) => {
    try {
      let resp = await model.upgradeImage(name, args.imageVersion);
      console.log(`${name} docker image changed from ${resp.oldVersion} to ${resp.newVersion}

-------- Docker Compose Contents --------
${resp.dockerCompose}`);
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)

if( !program.args.length ) {
  program.outputHelp();
}