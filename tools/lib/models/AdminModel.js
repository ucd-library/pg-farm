import {BaseModel} from '@ucd-lib/cork-app-utils';
import AdminService from '../services/AdminService.js';
import AdminStore from '../stores/AdminStore.js';

class AdminModel extends BaseModel {

  constructor() {
    super();

    this.store = AdminStore;
    this.service = AdminService;
      
    this.register('AdminModel');
  }

  getConnections() {
    return this.service.getConnections();
  }

  getConnectionLog(sessionId) {
    return this.service.getConnectionLog(sessionId);
  }

  sleep(ms) {
    return this.service.sleep(ms);
  }

}

const model = new AdminModel();
export default model;