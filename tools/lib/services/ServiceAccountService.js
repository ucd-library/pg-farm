import {BaseService} from '@ucd-lib/cork-app-utils';
import ServiceAccountStore from '../stores/ServiceAccountStore.js';
import payload from '../payload.js';
import serviceUtils from './utils.js';

class ServiceAccountService extends BaseService {

  constructor() {
    super();
    this.store = ServiceAccountStore;
    this.basePath = `${serviceUtils.host}/api/service-account`;
  }

  /**
   * @method create
   * @description Creates a new service account via the admin API.
   *
   * @param {string} name - service account name
   * @param {string} parent - parent username
   * @param {string} description - human-readable description
   * @returns {Promise<Object>}
   */
  async create(name, parent, description) {
    let ido = {action: 'create', name, parent};
    let id = payload.getKey(ido);

    await this.checkRequesting(
      id, this.store.data.actions,
      () => this.request({
        url: this.basePath,
        fetchOptions: {
          method : 'POST',
          headers: serviceUtils.authHeader({'Content-Type': 'application/json'}),
          body   : JSON.stringify({name, parent, description})
        },
        onLoading: request => this.store.onCreateUpdate(ido, {request}),
        onLoad   : payload  => this.store.onCreateUpdate(ido, {payload: payload.body}),
        onError  : error    => this.store.onCreateUpdate(ido, {error})
      })
    );

    return this.store.data.actions.get(id);
  }

  /**
   * @method rotatePassword
   * @description Rotates the password for an existing service account.
   *
   * @param {string} name - service account name
   * @returns {Promise<Object>}
   */
  async rotatePassword(name) {
    let ido = {action: 'rotate', name};
    let id = payload.getKey(ido);

    await this.checkRequesting(
      id, this.store.data.actions,
      () => this.request({
        url: `${this.basePath}/${encodeURIComponent(name)}/rotate`,
        fetchOptions: {
          method : 'POST',
          headers: serviceUtils.authHeader()
        },
        onLoading: request => this.store.onRotateUpdate(ido, {request}),
        onLoad   : payload  => this.store.onRotateUpdate(ido, {payload: payload.body}),
        onError  : error    => this.store.onRotateUpdate(ido, {error})
      })
    );

    return this.store.data.actions.get(id);
  }

}

const service = new ServiceAccountService();
export default service;
