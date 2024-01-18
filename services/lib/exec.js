import {exec} from 'child_process';
import logger from './logger.js';

export default function (command, args={}, options={}) {
  if( !args.shell ) {
    args.shell = '/bin/bash';
  }

  return new Promise((resolve, reject) => {
    logger.debug('executing', command, args);
    let proc = exec(command, args, (error, stdout, stderr) => {
      logger.debug('exec complete', command);

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