const { spawn } = require('child_process');

const defaultOptions = {
  shell : '/bin/bash',
  stdio: [ 'inherit', 'inherit', 'inherit']
}

module.exports = (cmd, args=[], options={}) => {
  return new Promise((resolve, reject) => {
    let dopts = Object.assign({}, defaultOptions);
    options = Object.assign(dopts, options);

    let stdout = '';
    cmd = spawn(cmd, args, options)
      .on('close', (code) => {
        if( code === 0 ) resolve({stdout, code});
        else reject(code);
      });
  });
}