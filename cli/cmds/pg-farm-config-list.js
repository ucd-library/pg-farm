const program = require('commander');
const config = require('../../node-lib/lib/config');

program
  .action(() => {
    for( let key in config ) {
      if( typeof config[key] === 'function' ) continue;
      console.log(key+': '+config[key]);
    }
  })
  .parse(process.argv)