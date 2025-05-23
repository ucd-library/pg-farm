import { getLogger } from '@ucd-lib/cork-app-utils';
import {config} from '../../../../tools/lib/config.js';

class User {

  constructor(){

    this.logger = getLogger('UserUtils');

    this.loggedIn = false;
    this.isAdmin = false;
    this.loginPath = '';
    this.logoutPath = '';

    this.user = null;
    this.token = null;
    this.username = '';

    this.loadConfig();
  }

  async loadConfig(){
    let user = await config.getUser();
    if (!user ){
      this.logger.warn('No user config found');
      return;
    }
    this.user = user.user;
    this.token = user.token;
    this.loggedIn = this.user?.loggedIn || false;
    this.isAdmin = this.user?.roles?.includes('admin');

    this.loginPath = window.APP_CONFIG?.loginPath;
    this.logoutPath = window.APP_CONFIG?.logoutPath;

    this.username = this.user?.username || this.user?.preferred_username || '';
  }
}

export default new User();
