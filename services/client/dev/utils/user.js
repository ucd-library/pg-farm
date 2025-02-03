import { getLogger } from '@ucd-lib/cork-app-utils';

class User {

  constructor(){

    this.logger = getLogger('UserUtils');

    this.loggedIn = false;
    this.token = null;
    this.tokenParsed = null;
    this.isAdmin = false;
    this.loginPath = '';
    this.logoutPath = '';

    this.loadConfig();
  }

  loadConfig(){
    if (!window.APP_CONFIG?.user ){
      this.logger.warn('No user config found');
      return;
    }

    this.loggedIn = window.APP_CONFIG.user.loggedIn;
    this.isAdmin = this.user?.roles?.includes('admin');

    this.loginPath = window.APP_CONFIG.loginPath;
    this.logoutPath = window.APP_CONFIG.logoutPath;
  }
}

export default new User();
