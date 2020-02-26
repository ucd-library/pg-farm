const program = require('commander');
const model = require('../../node-lib/models/cluster');
const prompts = require('prompts');

program
  .arguments('<name>')
  .option('-f --force [schema]', 'Force restore without a confirm prompt')
  .action(async (name, args) => {
    if( !args.force ) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: `Are you sure you want to restore cluster ${name}? This will clean the database and restore from data in S3 bucket.`,
        initial: false
      });

      if( !response.value ) return;
    }

    try {
      let {stdout, stderr} = await model.restore(name);
      console.log(stderr);
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)

if( !program.args.length ) {
  program.outputHelp();
}