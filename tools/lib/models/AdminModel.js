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

  /**
   * @description Fetches the UCD IAM profile for the user and stores it in the admin database
   * @param {String} user - kerberos username
   * @returns
   */
  updateUcdIamProfile(user) {
    return this.service.updateUcdIamProfile(user);
  }

}

const model = new AdminModel();
export default model;
