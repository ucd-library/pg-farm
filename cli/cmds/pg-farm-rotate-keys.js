const program = require('commander');
const defaultOpts = require('../lib/defaults-opts');
const model = require('../../node-lib/models/cluster');

defaultOpts
  .wrap(program)
  .option('-i --key-id <id>', 'AWS S3 access key id')
  .option('-s --key-secret <secret>', 'AWS S3 access key secret')
  .action((args) => {
    try {
      model.setAwsKeys(args.keyId, args.keySecret);
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)