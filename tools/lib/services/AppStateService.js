import {BaseService} from '@ucd-lib/cork-app-utils';
import AppStateStore from '../stores/AppStateStore.js';

class AppStateService extends BaseService {

  constructor() {
    super();
    this.store = AppStateStore;
  }

}

const service = new AppStateService();
export default service;