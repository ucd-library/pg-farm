import {BaseStore, LruStore} from '@ucd-lib/cork-app-utils';

class IconStore extends BaseStore {

  constructor() {
    super();

    this.data = {
      svgs : new LruStore({name: 'icon.svgs', maxSize: 2000}),
      get : new LruStore({name: 'icon.get'})
    };
    this.events = {};
  }

}

const store = new IconStore();
export default store;
