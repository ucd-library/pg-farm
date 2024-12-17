import {AppStateStore} from '@ucd-lib/cork-app-state';

class AppStateStoreImpl extends AppStateStore {
  constructor(){
    super();

    this.events.APP_LOADING_UPDATE = 'app-loading-update';
  }
}

const store = new AppStateStoreImpl();
export default store;
