import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';
import utils from './utils.js';


class OrganizationStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      create : new LruStore({name: 'organization.create'}),
      metadata : new LruStore({name: 'organization.metadata'}),
      update : new LruStore({name: 'organization.update'}),
      users : new LruStore({name: 'organization.users'}),
    };
    this.events = {
      ORGANIZATION_CREATE_UPDATE : 'organization-create-update',
      ORGANIZATION_METADATA_UPDATE : 'organization-metadata-update',
      ORGANIZATION_UPDATE_UPDATE : 'organization-update-update',
      ORGANIZATION_USERS_UPDATE : 'organization-users-update'
    };
  }

  onCreateUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.create,
      this.events.ORGANIZATION_CREATE_UPDATE
    );
  }

  onMetadataUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.metadata,
      this.events.ORGANIZATION_METADATA_UPDATE
    );
  }

  onUpdateUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.update,
      this.events.ORGANIZATION_UPDATE_UPDATE
    );
  }

  onUsersUpdate(ido, payload) {
    this._set(
      utils.getAppPayload(ido, payload),
      this.data.users,
      this.events.ORGANIZATION_USERS_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new OrganizationStore();
export default store;