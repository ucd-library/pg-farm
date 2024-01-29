import crypto from 'crypto';
import net from 'net';

const DELAY_TIME = 2500;

class PgFarmUtils {

  /**
   * @method generatePassword
   * @description generates a random password.  Defaults to 32 characters.
   * 
   * @param {String} length password length
   * 
   * @returns {String}
   */
  generatePassword(length = 32) {
    return crypto.randomBytes(length).toString('base64')
  }

  /**
   * @function waitUntil
   * @description promise resolves when TCP response is recieved on host/port
   * 
   * @param {String} host
   * @param {Number} port
   * @param {Number} maxAttempts Optional.  Maximum number of attempts to try before
   * @param {Number} delayTime Optional.  Time to wait between connect attempts.  Defaults
   * to 2.5s.
   * 
   * @returns {Promise}
   */
  waitUntil(host, port, maxAttempts=0, delayTime) {
    if( !delayTime ) delayTime = DELAY_TIME;
    port = parseInt(port);

    let opts = {
      delayTime,
      maxAttempts,
      attempt : 0
    }

    return new Promise((resolve, reject) => {
      opts.resolve = resolve;
      opts.reject = reject;
      setTimeout(() => attempt(host, port, opts), delayTime);
    });
  }

  /**
   * @method isAlive
   * @description returns true if TCP response is recieved on host/port
   * 
   * @param {String} host 
   * @param {Number} port 
   * 
   * @returns {Promise<Boolean>}
   */
  isAlive(host, port) {
    port = parseInt(port);
  
    return new Promise((resolve, reject) => {
      let client = new net.Socket();
      client.connect(port, host, function() {
        resolve(true);
        client.destroy();
      });
      client.on('error', function(e) {
        resolve(false);
        client.destroy(); 
      });
    });
  }

  closeSocket(socket) {
    return new Promise((resolve, reject) => {
      socket.end(() => {
        socket.destroy();
        resolve();
      });
    });
  }

  sleep(ms=100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

function attempt(host, port, opts) {
  let client = new net.Socket();
  client.connect(port, host, function() {
    opts.resolve();
    client.destroy();
  });
  client.on('error', function(e) {
    opts.attempt++;
    if( opts.maxAttempts > 0 && opts.attempt >= opts.maxAttempts ) {
      opts.reject('Max attempts reached ('+opts.maxAttempts+') waiting for '+host+':'+port+' to respond');
      return;
    }

    setTimeout(() => attempt(host, port, opts), opts.delayTime);
    client.destroy(); 
  });
}


const instance = new PgFarmUtils();
export default instance;