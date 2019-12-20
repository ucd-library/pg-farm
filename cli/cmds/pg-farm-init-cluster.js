const program = require('commander');
const prompts = require('prompts');
const defaultOpts = require('../lib/defaults-opts');
const fs = require('fs');
const path = require('path');
const error = require('../lib/error'); 

const CLUSTER_TYPES = ['streaming', 'snapshot', 'hosted'];

defaultOpts
  .wrap(program)
  .action(opts => action(opts))
  .parse(process.argv);


async function action(opts) {
  opts = defaultOpts.handle(opts);
  let clusterConfig = {};

  let response = await prompts({
    type: 'text',
    name: 'name',
    message: 'PG Farm cluster name?',
    validate: value => {
      let exists = fs.existsSync(path.join(opts.rootDir, value));
      if( exists ) return 'A cluster already exists with name: '+value;
      return true;
    }
  }, {onCancel});
  clusterConfig.name = response.name;
  if( !clusterConfig.name ) {
    error('Cluster name required');
  }

  response = await prompts({
    type: 'text',
    name: 'type',
    message: 'What type of PG Farm cluster? ['+CLUSTER_TYPES.join('|')+']',
    validate: value => CLUSTER_TYPES.includes(value) ? true : 'Invalid cluster type: '+value
  }, {onCancel});
  clusterConfig.type = response.type

  console.log(clusterConfig);
}

function onCancel() {
  process.exit(-1);
}