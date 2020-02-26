const program = require('commander');
const defaultOpts = require('../lib/defaults-opts');
const config = require('../../node-lib/lib/config');

defaultOpts
  .wrap(program)
  .action(() => {
    for( let key in config ) {
      if( typeof config[key] === 'function' ) continue;
      console.log(key+': '+config[key]);
    }
  })
  .parse(process.argv)