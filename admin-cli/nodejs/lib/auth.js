import LocalLoginServer from './local-server.js';
import {config} from './config.js';

class Auth {

  login(opts) {
    opts.authUrl = config.host + config.loginPath;

    if( opts.headless ) {
      this.headlessLogin(opts);
      return;
    }

    let localServer = new LocalLoginServer();
    return localServer.create(opts);
  }

}

const instance = new Auth();
export default instance;