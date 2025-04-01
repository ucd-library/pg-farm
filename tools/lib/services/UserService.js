import {BaseService} from '@ucd-lib/cork-app-utils';
import UserStore from '../stores/UserStore.js';
import serviceUtils from './utils.js';

class UserService extends BaseService {

  constructor() {
    super();
    this.store = UserStore;
    this.basePath = `${serviceUtils.host}/api/user`;
  }

  async getMe() {
    await this.request({
      url : `${this.basePath}/me`,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      onLoading: request => this.store.onMeUpdate({request}),
      onLoad: payload => this.store.onMeUpdate({payload: payload.body}),
      onError: error => this.store.onMeUpdate({error})
    });

    return this.store.data.me.get('me');
  }

}

const service = new UserService();
export default service;
