import {BaseModel} from '@ucd-lib/cork-app-utils';
import InstanceService from '../services/InstanceService.js';
import InstanceStore from '../stores/InstanceStore.js';

class InstanceModel extends BaseModel {

  constructor() {
    super();

    this.store = InstanceStore;
    this.service = InstanceService;
      
    this.register('InstanceModel');
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

  start(org, instance, opts) {
    instance = this.formatName(instance);
    return this.service.start(org, instance, opts);
  }

  stop(org, instance, opts) {
    instance = this.formatName(instance);
    return this.service.stop(org, instance, opts);
  }

  restart(org, instance) {
    instance = this.formatName(instance);
    return this.service.restart(org, instance);
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

  syncUsers(org, instance) {
    instance = this.formatName(instance);
    return this.service.syncUsers(org, instance);
  }

}

const model = new InstanceModel();
export default model;