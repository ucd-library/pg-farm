import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';
import payloadUtils from '../payload.js';

class UserStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      me: new LruStore({name: 'user.me'}),
      myDatabases: new LruStore({name: 'user.myDatabases'}),
      search: new LruStore({name: 'user.search'}),
    };
    this.events = {
      USER_ME_UPDATE : 'user-me-update',
      USER_MY_DATABASES_UPDATE : 'user-my-databases-update',
      USER_SEARCH_UPDATE : 'user-search-update',
    };
  }

  onMeUpdate(payload) {
    this._set(
      {id: 'me', ...payload},
      this.data.me,
      this.events.USER_ME_UPDATE
    );
  }

  onMyDatabasesUpdate(ido, payload) {
    this._set(
      payloadUtils.generate(ido, payload),
      this.data.myDatabases,
      this.events.USER_MY_DATABASES_UPDATE
    );
  }

  onSearchUpdate(payload) {
    this._set(
      {id: 'search', ...payload},
      this.data.search,
      this.events.USER_SEARCH_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new UserStore();
export default store;
