import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';

class ContactStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      submit : new LruStore({name: 'contact.submit'}),
    };
    this.events = {
      CONTACT_SUBMIT_UPDATE : 'contact-submit-update'
    };
  }

  onSubmitUpdate(id, payload) {
    this._set(
      {id, ...payload},
      this.data.submit,
      this.events.CONTACT_SUBMIT_UPDATE
    );
  }

  _set(payload, store, event) {
    store.set(payload.id, payload);
    this.emit(event, payload);
  }

}

const store = new ContactStore();
export default store;
