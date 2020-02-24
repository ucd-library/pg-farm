let config = require('../../node-lib/lib/config');

class DefaultOpts {

  wrap(program) {
    program
      .option('-f, --config-file <file>', 'config file to use')
      .option('-d, --root-dir <dir>', 'root directory of the farm');
    return program;
  }

  handle(cmdOpts) {
    return config(cmdOpts);
  }

}

module.exports = new DefaultOpts();