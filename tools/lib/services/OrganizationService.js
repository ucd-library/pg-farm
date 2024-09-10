import {BaseService} from '@ucd-lib/cork-app-utils';
import OrganizationStore from '../stores/OrganizationStore.js';
import serviceUtils from './utils.js';
import utils from '../utils.js';
import {config} from '../config.js'

class OrganizationService extends BaseService {

  constructor() {
    super();
    this.store = OrganizationStore;
    this.basePath = `${config.host}/api/organization`;
  }

  async create(opts) {
    let org = opts.name;
    let id = utils.getIdPath({org});

    await this.request({
      url: this.basePath,
      fetchOptions: {
        method : 'POST',
        body: opts,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onCreateUpdate({org}, {request}),
      onLoad: payload => this.store.onCreateUpdate({org}, {payload: payload.body}),
      onError: error => this.store.onCreateUpdate({org}, {error})
    });

    return this.store.data.create.get(id);
  }

  async get(org) {
    let id = utils.getIdPath({org});

    await serviceUtils.checkRequesting(
      id, this.store.data.metadata,
      () => this.request({
          url: `${this.basePath}/${org}`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onMetadataUpdate({org}, {request}),
          onLoad: payload => this.store.onMetadataUpdate({org}, {payload: payload.body}),
          onError: error => this.store.onMetadataUpdate({org}, {error})
        })
    );

    return this.store.data.metadata.get(id);
  }

  async getUsers(org) {
    let id = utils.getIdPath({org});

    await serviceUtils.checkRequesting(
      id, this.store.data.users,
      () => this.request({
          url: `${this.basePath}/${org}/users`,
          fetchOptions: {
            headers: serviceUtils.authHeader()
          },
          onLoading: request => this.store.onUsersUpdate({org}, {request}),
          onLoad: payload => this.store.onUsersUpdate({org}, {payload: payload.body}),
          onError: error => this.store.onUsersUpdate({org}, {error})
        })
    );

    return this.store.data.users.get(id);
  }

  async update(org, opts) {
    let id = utils.getIdPath({org});

    await this.request({
      url: `${this.basePath}/${org}`,
      fetchOptions: {
        method : 'PATCH',
        body: opts,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUpdateUpdate({org}, {request}),
      onLoad: payload => this.store.onUpdateUpdate({org}, {payload: payload.body}),
      onError: error => this.store.onUpdateUpdate({org}, {error})
    });

    return this.store.data.update.get(id);
  }

}

const service = new OrganizationService();
export default service;