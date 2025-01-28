import {BaseService} from '@ucd-lib/cork-app-utils';
import InstanceStore from '../stores/InstanceStore.js';
import {config} from '../config.js'
import payload from '../payload.js';
import serviceUtils from './utils.js';

class InstanceService extends BaseService {

  constructor() {
    super();
    this.store = InstanceStore;
    this.basePath = `${serviceUtils.host}/api/instance`;
  }

  async create(opts) {
    let instance = opts.name;
    let org = opts.organization;
    let id = payload.getKey({org, instance});

    await this.request({
      url: `${this.basePath}`,
      fetchOptions: {
        method : 'POST',
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

  async list(opts={}) {
    let id = JSON.stringify(opts);

    await this.request({
      url: `${this.basePath}`,
      qs: opts,
      fetchOptions: {
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onListUpdate({id, request}),
      onLoad: payload => this.store.onListUpdate({id, payload: payload.body}),
      onError: error => this.store.onListUpdate({id, error})
    });

    return this.store.data.list.get(id);
  }

  async get(org, instance) {
    let ido = {org, instance};
    let id = payload.getKey(ido);

    await this.checkRequesting(
      id, this.store.data.get,
      () => this.request({
        url: `${this.basePath}/${org}/${instance}`,
        fetchOptions: {
          headers: serviceUtils.authHeader()
        },
        json: true,
        onLoading: request => this.store.onGetUpdate(ido, {request}),
        onLoad: payload => this.store.onGetUpdate(ido, {payload: payload.body}),
        onError: error => this.store.onGetUpdate(ido, {error})
      })
    );

    return this.store.data.get.get(id);
  }

  async addUser(org, instance, user, opts) {
    let ido = {org, instance, user};
    let id = payload.getKey(ido);

    let flags = {};
    if( opts.admin ) flags.type = 'ADMIN';
    else if( opts.serviceAccount ) flags.type = 'SERVICE_ACCOUNT';
    if( opts.parent ) flags.parent = opts.parent;

    await this.request({
      url: `${this.basePath}/${org}/${instance}/${user}`,
      qs: flags,
      fetchOptions: {
        method : 'PUT',
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUserAddUpdate(ido, {request}),
      onLoad: payload => this.store.onUserAddUpdate(ido, {payload: payload.body}),
      onError: error => this.store.onUserAddUpdate(ido, {error})
    });

    return this.store.data.addUser.get(id);
  }

  async updateUser(org, instance, user, opts) {
    let ido = {org, instance, user, action: 'update-user'};
    let id = payload.getKey(ido);
    let flags = {
      type: opts.type
    };

    await this.request({
      url: `${this.basePath}/${org}/${instance}/${user}`,
      qs: flags,
      fetchOptions: {
        method : 'PATCH',
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUserUpdateUpdate(ido, {request}),
      onLoad: payload => this.store.onUserUpdateUpdate(ido, {payload: payload.body}),
      onError: error => this.store.onUserUpdateUpdate(ido, {error})
    });

    return this.store.data.actions.get(id);
  }

  async deleteUser(org, instance, user) {
    let ido = {org, instance, user, action: 'delete-user'};
    let id = payload.getKey(ido);

    await this.request({
      url: `${this.basePath}/${org}/${instance}/${user}`,
      fetchOptions: {
        method : 'DELETE',
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onUserDeleteUpdate(ido, {request}),
      onLoad: payload => this.store.onUserDeleteUpdate(ido, {payload: payload.body}),
      onError: error => this.store.onUserDeleteUpdate(ido, {error})
    });

    return this.store.data.actions.get(id);
  }

  async start(org, instance, opts) {
    let id = payload.getKey({org, instance});

    let flags = {};
    if( opts.force ) flags.force = true;

    await this.request({
      url: `${this.basePath}/${org}/${instance}/start`,
      qs: flags,
      fetchOptions: {
        method : 'POST',
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onStartUpdate({org, instance}, {request}),
      onLoad: payload => this.store.onStartUpdate({org, instance}, {payload: payload.body}),
      onError: error => this.store.onStartUpdate({org, instance}, {error})
    });

    return this.store.data.start.get(id);
  }

  async stop(org, instance) {
    let id = payload.getKey({org, instance});


    await this.request({
      url: `${this.basePath}/${org}/${instance}/stop`,
      fetchOptions: {
        method : 'POST',
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
    let id = payload.getKey({org, instance});

    await this.request({
      url: `${this.basePath}/${org}/${instance}/restart`,
      fetchOptions: {
        method : 'POST',
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
    let id = payload.getKey({org, instance});

    await this.request({
      url: `${this.basePath}/${org}/${instance}/backup`,
      fetchOptions: {
        method : 'POST',
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
    let id = payload.getKey({org, instance});

    await this.request({
      url: `${this.basePath}/${org}/${instance}/archive`,
      fetchOptions: {
        method : 'POST',
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
    let id = payload.getKey({org, instance});

    await this.request({
      url: `${this.basePath}/${org}/${instance}/restore`,
      fetchOptions: {
        method : 'POST',
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
    let id = payload.getKey({org, instance});

    await this.request({
      url: `${this.basePath}/${org}/${instance}/resize`,
      fetchOptions: {
        method : 'POST',
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

  async syncUsers(org, instance) {
    let id = payload.getKey({org, instance});

    await this.request({
      url: `${this.basePath}/${org}/${instance}/sync-users`,
      fetchOptions: {
        method : 'POST',
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
