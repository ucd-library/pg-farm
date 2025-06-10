import {BaseModel} from '@ucd-lib/cork-app-utils';
import UserService from '../services/UserService.js';
import UserStore from '../stores/UserStore.js';

class UserModel extends BaseModel {

  constructor() {
    super();

    this.store = UserStore;
    this.service = UserService;

    this.register('UserModel');
  }

  getMe() {
    return this.service.getMe();
  }

  myDatabases(org) {
    return this.service.myDatabases(org);
  }

  search(username, contextOptions = {}) {
    return this.service.search(username, contextOptions);
  }

}

const model = new UserModel();
export default model;
