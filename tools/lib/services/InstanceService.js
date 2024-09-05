import {BaseService} from '@ucd-lib/cork-app-utils';
import InstanceStore from '../stores/InstanceStore.js';
import utils from '../utils.js';

class InstanceService extends BaseService {

  constructor() {
    super();
    this.store = InstanceStore;
    this.basePath = `${config.host}/api/instance`;
  }

  async create(opts) {
    let instance = opts.name;
    let org = opts.organization;
    let id = utils.getIdPath({org, instance});

    await this.request({
      method : 'POST',
      url: `${this.basePath}`,
      fetchOptions: {
        body: opts,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onCreateUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onCreateUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onCreateUpdate({org, instance}, {error})
    });

    return this.store.data.create.get(id);
  }

  async addUser(org, instance, user, opts) {
    let id = utils.getIdPath({org, instance, user});

    let flags = {};
    if( opts.admin ) flags.type = 'ADMIN';
    else if( opts.serviceAccount ) flags.type = 'SERVICE_ACCOUNT';
    if( opts.parent ) flags.parent = opts.parent;

    await this.request({
      method : 'PUT',
      url: `${this.basePath}/${org}/${instance}/${user}`,
      qs: flags,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUserAddUpdate({org, instance, user}, {request}),
      onLoad: payload => this.store.onUserAddUpdate({org, instance, user}, {payload: payload.body}),
      onError: error => this.store.onUserAddUpdate({org, instance, user}, {error})
    });

    return this.store.data.userAdd.get(id);
  }

  async start(org, instance, opts) {
    let id = utils.getIdPath({org, instance});

    let flags = {};
    if( opts.force ) flags.force = true;

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/start`,
      qs: flags,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onStartUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onStartUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onStartUpdate({org, instance}, {error})
    });

    return this.store.data.start.get(id);
  }

  async stop(org, instance, opts) {
    let id = utils.getIdPath({org, instance});

    let flags = {};
    if( opts.force ) flags.force = true;

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/stop`,
      qs: flags,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onStopUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onStopUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onStopUpdate({org, instance}, {error})
    });

    return this.store.data.stop.get(id);
  }

  async restart(org, instance) {
    let id = utils.getIdPath({org, instance});

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/restart`,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onRestartUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onRestartUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onRestartUpdate({org, instance}, {error})
    });

    return this.store.data.restart.get(id);
  }

  async backup(org, instance) {
    let id = utils.getIdPath({org, instance});

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/backup`,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onBackupUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onBackupUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onBackupUpdate({org, instance}, {error})
    });

    return this.store.data.backup.get(id);
  }

  async archive(org, instance) {
    let id = utils.getIdPath({org, instance});

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/archive`,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onArchiveUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onArchiveUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onArchiveUpdate({org, instance}, {error})
    });

    return this.store.data.archive.get(id);
  }

  async restore(org, instance) {
    let id = utils.getIdPath({org, instance});

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/restore`,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onRestoreUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onRestoreUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onRestoreUpdate({org, instance}, {error})
    });

    return this.store.data.restore.get(id);
  }

  async resize(org, instance, size) {
    let id = utils.getIdPath({org, instance});

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/resize`,
      fetchOptions: {
        body: {size},
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onResizeUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onResizeUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onResizeUpdate({org, instance}, {error})
    });

    return this.store.data.resize.get(id);
  }

  async resize(org, instance) {
    let id = utils.getIdPath({org, instance});

    await this.request({
      method : 'POST',
      url: `${this.basePath}/${org}/${instance}/sync-users`,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onSyncUsersUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onSyncUsersUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onSyncUsersUpdate({org, instance}, {error})
    });

    return this.store.data.syncUsers.get(id);
  }

}

const service = new InstanceService();
export default service;