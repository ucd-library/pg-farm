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
    const store = this.store.data.me;
    const id = 'me';

    await this.checkRequesting(
      id, store,
      () => this.request({
        url : `${this.basePath}/me`,
        fetchOptions: {
          headers: serviceUtils.authHeader()
        },
        onUpdate : resp => this.store.set(
          {id, ...resp},
          store
        ),
        checkCached: () => store.get(id)
      })
    );

    return store.get(id);
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

  async search(username, contextOptions = {}) {
    await this.request({
      url : `${serviceUtils.host}/api/admin/ucd-iam-profile/search/${username}`,
      qs: contextOptions,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      onLoading: request => this.store.onSearchUpdate({request}),
      onLoad: payload => this.store.onSearchUpdate({payload: payload.body}),
      onError: error => this.store.onSearchUpdate({error})
    });

    return this.store.data.search.get('search');
  }

}

const service = new UserService();
export default service;
