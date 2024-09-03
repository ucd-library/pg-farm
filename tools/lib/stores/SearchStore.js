import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';

class SearchStore extends BaseStore {

  constructor() {
    super();

    this.data = {};
    this.events = {};
  }



}

const store = new SearchStore();
export default store;