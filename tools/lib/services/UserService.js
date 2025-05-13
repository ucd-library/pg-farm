import {BaseService} from '@ucd-lib/cork-app-utils';
import UserStore from '../stores/UserStore.js';
import payload from '../payload.js';
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

  async myDatabases(org){
    let ido = {org};
    let id = payload.getKey(ido);
    let qs = org ? {org} : null;

    await this.checkRequesting(
      id, this.store.data.myDatabases,
      () => this.request({
        url: `${this.basePath}/me/db`,
        qs,
        fetchOptions: {
          headers: serviceUtils.authHeader()
        },
        onLoading: request => this.store.onMyDatabasesUpdate(ido, {request}),
        onLoad: payload => this.store.onMyDatabasesUpdate(ido, {payload: payload.body}),
        onError: error => this.store.onMyDatabasesUpdate(ido, {error})
      })
    );
    return this.store.data.myDatabases.get(id);
  }

}

const service = new UserService();
export default service;
