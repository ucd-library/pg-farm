import {BaseService} from '@ucd-lib/cork-app-utils';
import OrganizationStore from '../stores/OrganizationStore.js';
import utils from '../utils.js';

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
      method : 'POST',
      url: this.basePath,
      fetchOptions: {
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

  async update(org, opts) {
    let id = utils.getIdPath({org});

    await this.request({
      method : 'PATCH',
      url: `${this.basePath}/${org}`,
      fetchOptions: {
        body: opts,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUpdate({org}, {request}),
      onLoad: payload => this.store.onUpdate({org}, {payload: payload.body}),
      onError: error => this.store.onUpdate({org}, {error})
    });

    return this.store.data.update.get(id);
  }

  async addUser(org, user, role) {
    let id = utils.getIdPath({org, user});

    await this.request({
      method : 'PUT',
      url: `${this.basePath}/${org}/${user}/${role}`,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUserAddUpdate({org, user}, {request}),
      onLoad: payload => this.store.onUserAddUpdate({org, user}, {payload: payload.body}),
      onError: error => this.store.onUserAddUpdate({org, user}, {error})
    });

    return this.store.data.userAdd.get(id);
  }

}

const service = new OrganizationService();
export default service;