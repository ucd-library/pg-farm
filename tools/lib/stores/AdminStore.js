import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';
import payloadUtils from '../payload.js';

class AdminStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      actions : new LruStore({name: 'admin.actions'})
    };
    this.events = {
      CONNECTIONS_UPDATE : 'admin-connections-update',
      CONNECTION_LOG_UPDATE : 'admin-connection-log-update'
    };
  }

  onConnectionsUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.CONNECTIONS_UPDATE
    );
  }

  onConnectionLogUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.CONNECTION_LOG_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new AdminStore();
export default store;