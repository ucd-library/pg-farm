import { getLogger } from '@ucd-lib/cork-app-utils';
import {config} from '../../../../tools/lib/config.js';

class User {

  constructor(){

    this.logger = getLogger('UserUtils');

    this.loggedIn = false;
    this.isAdmin = false;
    this.loginPath = '';
    this.logoutPath = '';

    this.jwt = null;
    this.username = '';

    this.loadConfig();
  }

  async loadConfig(){
    let user = await config.getUser();
    if (!user ){
      this.logger.warn('No user config found');
      return;
    }

    this.loggedIn = user.loggedIn;
    this.jwt = user;
    this.isAdmin = this.user?.roles?.includes('admin');

    this.loginPath = window.APP_CONFIG.loginPath;
    this.logoutPath = window.APP_CONFIG.logoutPath;

    this.username = this.jwt?.username || this.jwt?.preferred_username || '';
  }
}

export default new User();
