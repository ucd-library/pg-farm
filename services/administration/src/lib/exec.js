import {exec} from 'child_process';

export default function (command, args={}, options={}) {
  if( !args.shell ) {
    args.shell = '/bin/bash';
  }

  return new Promise((resolve, reject) => {
    console.log('executing', command, args);
    let proc = exec(command, args, (error, stdout, stderr) => {
      console.log('exec complete', command);

      if (error) {
        reject(error);
        return;
      }

      resolve({stdout, stderr});
    });

    if (options.input) {
      proc.stdin.write(options.input);
      proc.stdin.end();
    }
  });
}