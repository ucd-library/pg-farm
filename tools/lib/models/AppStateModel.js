import {AppStateModel} from '@ucd-lib/cork-app-state';
import AppStateStore from '../stores/AppStateStore.js';
import clone from 'clone';
import {config} from '../config.js';

class AppStateModelImpl extends AppStateModel {

  constructor() {
    super();
    this.store = AppStateStore;

    this.init(config.appRoutes);
  }

  set(update) {
    if( update.location ) {
      update.lastLocation = clone(this.store.data.location);

      let page = update.location.path ? update.location.path[0] : 'home';
      if( !page ) page = 'home'

      if ( page === 'org' && update.location.path.length > 1 ) {
        page = 'org-single';
      }

      update.page = page;
    }

    return super.set(update);
  }

  refresh(){
    const state = this.store.data;
    this.store.emit(this.store.events.APP_STATE_UPDATE, state);
  }

  showLoading(){
    this.store.emit(this.store.events.APP_LOADING_UPDATE, {show: true});
  }

  hideLoading(){
    this.store.emit(this.store.events.APP_LOADING_UPDATE, {show: false});
  }

}

const model = new AppStateModelImpl();
export default model;
