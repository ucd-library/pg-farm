const program = require('commander');
const model = require('../../node-lib/models/farm');

program
  .action(async (name) => {
    try {
      console.log((await model.listImageVersions()).join('\n'));
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)