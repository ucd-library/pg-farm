import {AppStateStore} from '@ucd-lib/cork-app-state';

class AppStateStoreImpl extends AppStateStore {
  constructor(){
    super();

    this.events.APP_LOADING_UPDATE = 'app-loading-update';
    this.events.APP_ERROR_UPDATE = 'app-error-update';
  }
}

const store = new AppStateStoreImpl();
export default store;
