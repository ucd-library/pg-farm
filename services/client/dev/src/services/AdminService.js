import {BaseService} from '@ucd-lib/cork-app-utils';
import AdminStore from '../stores/AdminStore.js';

class AdminService extends BaseService {

  constructor() {
    super();
    this.store = AdminStore;
  }

}

const service = new AdminService();
export default service;