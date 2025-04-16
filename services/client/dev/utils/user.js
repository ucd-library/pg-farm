import { getLogger } from '@ucd-lib/cork-app-utils';

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

  loadConfig(){
    if (!window.APP_CONFIG?.user ){
      this.logger.warn('No user config found');
      return;
    }

    this.loggedIn = window.APP_CONFIG.user.loggedIn;
    this.jwt = window.APP_CONFIG.user;
    this.isAdmin = this.user?.roles?.includes('admin');

    this.loginPath = window.APP_CONFIG.loginPath;
    this.logoutPath = window.APP_CONFIG.logoutPath;

    this.username = this.jwt?.username || this.jwt?.preferred_username || '';
  }
}

export default new User();
