import {BaseStore} from '@ucd-lib/cork-app-utils';

class AdminStore extends BaseStore {

  constructor() {
    super();

    this.data = {};
    this.events = {};
  }

}

const store = new AdminStore();
export default store;