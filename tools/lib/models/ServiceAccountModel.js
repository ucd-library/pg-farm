import {BaseModel} from '@ucd-lib/cork-app-utils';
import ServiceAccountService from '../services/ServiceAccountService.js';
import ServiceAccountStore from '../stores/ServiceAccountStore.js';
import utils from '../utils.js';

class ServiceAccountModel extends BaseModel {

  constructor() {
    super();

    this.store = ServiceAccountStore;
    this.service = ServiceAccountService;

    this.register('ServiceAccountModel');
  }

  /**
   * @method create
   * @description Creates a new service account. Admin only.
   *
   * @param {string} name - service account name
   * @param {string} parent - parent username
   * @param {string} description - human-readable description
   * @returns {Promise<Object>}
   */
  create(name, parent, description) {
    return this.service.create(name, parent, description);
  }

  /**
   * @method rotatePassword
   * @description Rotates the password for an existing service account.
   *
   * @param {string} name - service account name
   * @returns {Promise<Object>}
   */
  async rotatePassword(name) {
    const res = await this.service.rotatePassword(name);
    if ( res.state === 'loaded') {
      utils.clearCache({ target: [{ model: 'UserModel', store: 'user.myServiceAccounts' }] });
    }
    return res;
  }

}

const model = new ServiceAccountModel();
export default model;
