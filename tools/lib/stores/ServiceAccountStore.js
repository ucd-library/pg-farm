import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';
import payloadUtils from '../payload.js';

class ServiceAccountStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      actions: new LruStore({name: 'service-account.actions'})
    };
    this.events = {
      SERVICE_ACCOUNT_CREATE_UPDATE  : 'service-account-create-update',
      SERVICE_ACCOUNT_ROTATE_UPDATE  : 'service-account-rotate-update'
    };
  }

  onCreateUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.SERVICE_ACCOUNT_CREATE_UPDATE
    );
  }

  onRotateUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.actions,
      this.events.SERVICE_ACCOUNT_ROTATE_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new ServiceAccountStore();
export default store;
