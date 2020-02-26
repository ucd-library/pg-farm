let config = require('../../node-lib/lib/config');
const fs = require('fs-extra');

class DefaultOpts {

  wrap(program) {
    program
      .option('--root-dir <dir>', 'root directory of the farm');
    return program;
  }

  handle(cmdOpts) {
    if( cmdOpts.rootDir ) {
      config.rootDir = cmdOpts.rootDir;
    }
  }

}

module.exports = new DefaultOpts();