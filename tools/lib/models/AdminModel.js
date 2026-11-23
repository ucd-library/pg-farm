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
   * @method publicUserReport
   * @description Get a report of all instances with public user enabled state and
   * public SQL login activity
   *
   * @param {Object} opts
   * @param {Boolean} opts.details optional.  include permission summary counts for running instances
   *
   * @returns {Promise<Object>}
   */
  publicUserReport(opts={}) {
    return this.service.publicUserReport(opts);
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
