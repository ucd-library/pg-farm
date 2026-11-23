import {BaseModel} from '@ucd-lib/cork-app-utils';
import InstanceService from '../services/InstanceService.js';
import InstanceStore from '../stores/InstanceStore.js';

class InstanceModel extends BaseModel {

  constructor() {
    super();

    this.store = InstanceStore;
    this.service = InstanceService;

    this.register('InstanceModel');

    this.inject('DatabaseModel');
  }

  formatName(name) {
    if( !name.match(/^inst-/) ) {
      name = 'inst-'+name;
    }
    return name;
  }

  formatPathName(name) {
    if( !name.match(/\//) ) {
      name = '_/'+name;
    }
    let parts = name.split('/');
    parts[1] = this.formatName(parts[1]);

    return parts.join('/');
  }

  create(opts) {
    return this.service.create(opts);
  }

  list(opts) {
    return this.service.list(opts);
  }

  get(org, instance) {
    instance = this.formatName(instance);
    return this.service.get(org, instance);
  }

  addUser(org, instance, user, opts) {
    instance = this.formatName(instance);
    return this.service.addUser(org, instance, user, opts);
  }

  updateUser(org, instance, user, opts) {
    instance = this.formatName(instance);
    return this.service.updateUser(org, instance, user, opts);
  }

  deleteUser(org, instance, user, opts) {
    instance = this.formatName(instance);
    return this.service.deleteUser(org, instance, user, opts);
  }

  async start(org, instance, opts) {
    instance = this.formatName(instance);
    const r = await this.service.start(org, instance, opts);
    if ( r.state === 'loaded' ){
      this.DatabaseModel.purgeCache('public');
    }
    return r;
  }

  stop(org, instance, opts) {
    instance = this.formatName(instance);
    return this.service.stop(org, instance, opts);
  }

  restart(org, instance) {
    instance = this.formatName(instance);
    return this.service.restart(org, instance);
  }

  updatePriority(org, instance, priority, apply=false) {
    instance = this.formatName(instance);
    return this.service.updatePriority(org, instance, priority, apply);
  }

  backup(org, instance) {
    instance = this.formatName(instance);
    return this.service.backup(org, instance);
  }

  archive(org, instance) {
    instance = this.formatName(instance);
    return this.service.archive(org, instance);
  }

  restore(org, instance) {
    instance = this.formatName(instance);
    return this.service.restore(org, instance);
  }

  resize(org, instance, size) {
    instance = this.formatName(instance);
    return this.service.resize(org, instance, size);
  }

  syncUsers(org, instance, opts={}) {
    instance = this.formatName(instance);
    return this.service.syncUsers(org, instance, opts);
  }

  /**
   * @method getPublicUser
   * @description Get the public user status and permission summary for an instance.
   * The summary lists tables/views the public user has READ or WRITE access to.
   *
   * @param {String} org organization name
   * @param {String} instance instance name
   *
   * @returns {Promise<Object>}
   */
  getPublicUser(org, instance) {
    instance = this.formatName(instance);
    return this.service.getPublicUser(org, instance);
  }

  /**
   * @method enablePublicUser
   * @description Enable the public user for an instance
   *
   * @param {String} org organization name
   * @param {String} instance instance name
   * @param {Object} opts
   * @param {Boolean} opts.dryRun optional.  if true, only return the planned changes
   *
   * @returns {Promise<Object>}
   */
  async enablePublicUser(org, instance, opts={}) {
    instance = this.formatName(instance);
    const r = await this.service.setPublicUser(org, instance, true, opts);
    if( r.state === 'loaded' && !opts.dryRun ) {
      this._purgeAfterPublicUserChange();
    }
    return r;
  }

  /**
   * @method disablePublicUser
   * @description Disable (remove) the public user for an instance.  This removes
   * all of the public user's permissions.
   *
   * @param {String} org organization name
   * @param {String} instance instance name
   * @param {Object} opts
   * @param {Boolean} opts.dryRun optional.  if true, only return the permission summary and planned changes
   *
   * @returns {Promise<Object>}
   */
  async disablePublicUser(org, instance, opts={}) {
    instance = this.formatName(instance);
    const r = await this.service.setPublicUser(org, instance, false, opts);
    if( r.state === 'loaded' && !opts.dryRun ) {
      this._purgeAfterPublicUserChange();
    }
    return r;
  }

  /**
   * @method _purgeAfterPublicUserChange
   * @description Purge cached instance and database data after the public user is toggled
   */
  _purgeAfterPublicUserChange() {
    this.store.data.get.purge();
    this.store.data.publicUser.purge();
    this.DatabaseModel.purgeCache('public');
  }

}

const model = new InstanceModel();
export default model;
