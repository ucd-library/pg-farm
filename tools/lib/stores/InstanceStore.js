import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';
import utils from './utils.js';

class InstanceStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      create : new LruStore({name: 'instance.create'}),
      list : new LruStore({name: 'instance.list'}),
      addUser : new LruStore({name: 'instance.addUser'}),
      start : new LruStore({name: 'instance.start'}),
      stop : new LruStore({name: 'instance.stop'}),
      restart : new LruStore({name: 'instance.restart'}),
      backup : new LruStore({name: 'instance.backup'}),
      archive : new LruStore({name: 'instance.archive'}),
      restore : new LruStore({name: 'instance.restore'}),
      resize : new LruStore({name: 'instance.resize'}),
      syncUsers : new LruStore({name: 'instance.syncUsers'}),
    };

    this.events = {
      INSTANCE_CREATE_UPDATE : 'instance-create-update',
      INSTANCE_LIST_UPDATE : 'instance-list-update',
      INSTANCE_ADD_USER_UPDATE : 'instance-add-user-update',
      INSTANCE_START_UPDATE : 'instance-start-update',
      INSTANCE_STOP_UPDATE : 'instance-stop-update',
      INSTANCE_RESTART_UPDATE : 'instance-restart-update',
      INSTANCE_BACKUP_UPDATE : 'instance-backup-update',
      INSTANCE_ARCHIVE_UPDATE : 'instance-archive-update',
      INSTANCE_RESTORE_UPDATE : 'instance-restore-update',
      INSTANCE_RESIZE_UPDATE : 'instance-resize-update',
      INSTANCE_SYNC_USERS_UPDATE : 'instance-sync-users-update',
    };
  }

  onCreateUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.create,
      this.events.INSTANCE_CREATE_UPDATE
    );
  }

  onListUpdate(payload) {
    this._set(
      payload,
      this.data.list,
      this.events.INSTANCE_LIST_UPDATE
    );
  }

  onUserAddUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.addUser,
      this.events.INSTANCE_ADD_USER_UPDATE
    );
  }

  onStartUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.start,
      this.events.INSTANCE_START_UPDATE
    );
  }

  onStopUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.stop,
      this.events.INSTANCE_STOP_UPDATE
    );
  }

  onRestartUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.restart,
      this.events.INSTANCE_RESTART_UPDATE
    );
  }

  onBackupUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.backup,
      this.events.INSTANCE_BACKUP_UPDATE
    );
  }

  onArchiveUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.archive,
      this.events.INSTANCE_ARCHIVE_UPDATE
    );
  }

  onRestoreUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.restore,
      this.events.INSTANCE_RESTORE_UPDATE
    );
  }

  onResizeUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.resize,
      this.events.INSTANCE_RESIZE_UPDATE
    );
  }

  onSyncUsersUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.syncUsers,
      this.events.INSTANCE_SYNC_USERS_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new InstanceStore();
export default store;