import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';

class UserStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      me: new LruStore({name: 'user.me'})
    };
    this.events = {
      USER_ME_UPDATE : 'user-me-update'
    };
  }

  onMeUpdate(payload) {
    this._set(
      {id: 'me', ...payload},
      this.data.me,
      this.events.USER_ME_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new UserStore();
export default store;
