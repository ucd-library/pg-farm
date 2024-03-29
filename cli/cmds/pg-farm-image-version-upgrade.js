const program = require('commander');
const model = require('../../node-lib/models/cluster');

program
  .arguments('<name>')
  .option('-v --image-version <version>', 'PG Farm image version to set for cluster')
  .action(async (name, args) => {
    try {
      let newVersion = await model.upgradeImage(name, args.imageVersion);
      console.log(`Farm ${name} updated to ${newVersion}

To complete the image version update run:
> pg-farm down ${name}
> $(pg-farm dc ${name}) pull
> pg-farm up ${name}
`);
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)

if( !program.args.length ) {
  program.outputHelp();
}