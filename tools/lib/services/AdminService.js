import {BaseService} from '@ucd-lib/cork-app-utils';
import AdminStore from '../stores/AdminStore.js';
import payload from '../payload.js';
import {config} from '../config.js'
import serviceUtils from './utils.js';


class AdminService extends BaseService {

  constructor() {
    super();
    this.store = AdminStore;
    this.basePath = `${config.host}/api/admin`;
  }

  async getConnections() {
    let ido = {action: 'get-connections'};
    let id = payload.getKey(ido);

    await this.checkRequesting(
      id, this.store.data.actions,
      () => this.request({
          url: `${this.basePath}/connections`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onConnectionsUpdate(ido, {request}),
          onLoad: payload => this.store.onConnectionsUpdate(ido, {payload: payload.body}),
          onError: error => this.store.onConnectionsUpdate(ido, {error})
        })
    );

    return this.store.data.actions.get(id);
  }

  async getConnectionLog(sessionId) {
    let ido = {action: 'get-connection-log'};
    let id = payload.getKey(ido);

    await this.checkRequesting(
      id, this.store.data.actions,
      () => this.request({
          url: `${this.basePath}/connection-log/${sessionId}`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onConnectionLogUpdate(ido, {request}),
          onLoad: payload => this.store.onConnectionLogUpdate(ido, {payload: payload.body}),
          onError: error => this.store.onConnectionLogUpdate(ido, {error})
        })
    );

    return this.store.data.actions.get(id);
  }

}

const service = new AdminService();
export default service;