import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';
import utils from './utils.js';


class OrganizationStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      create : new LruStore({name: 'organization.create'}),
      addUser : new LruStore({name: 'organization.addUser'}),
      update : new LruStore({name: 'organization.update'}),
    };
    this.events = {
      ORGANIZATION_CREATE_UPDATE : 'organization-create-update',
      ORGANIZATION_ADD_USER_UPDATE : 'organization-add-user-update',
      ORGANIZATION_UPDATE_UPDATE : 'organization-update-update'
    };
  }

  onCreateUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.create,
      this.events.ORGANIZATION_CREATE_UPDATE
    );
  }

  onUserAddUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.addUser,
      this.events.ORGANIZATION_ADD_USER_UPDATE
    );
  }

  onUpdateUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.update,
      this.events.ORGANIZATION_UPDATE_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new OrganizationStore();
export default store;