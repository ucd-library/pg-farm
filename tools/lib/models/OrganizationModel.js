import {BaseModel} from '@ucd-lib/cork-app-utils';
import OrganizationService from '../services/OrganizationService.js';
import OrganizationStore from '../stores/OrganizationStore.js';

class OrganizationModel extends BaseModel {

  constructor() {
    super();

    this.store = OrganizationStore;
    this.service = OrganizationService;

    this.register('OrganizationModel');
  }

  get(org) {
    return this.service.get(org);
  }

  getUsers(org) {
    return this.service.getUsers(org);
  }

  create(opts) {
    return this.service.create(opts);
  }

  update(org, opts) {
    return this.service.update(org, opts);
  }

  isAdmin(org) {
    return this.service.isAdmin(org);
  }

  getLogoUrl(org){
    return `${this.service.basePath}/${org}/logo`;
  }

  /**
   * @method search
   * @descsription search for databases.  Returns object with id and request promise.
   * When the request promise resolves, use getSearchResult(id) to get the result.  The
   * id is provided in the returned object.
   *
   * @param {Object} opts
   *
   * @returns {Object}
   **/
  search(opts={}) {
    return this.service.search(opts);
  }

  /**
   * @method getSearchResult
   * @description get search result by id retuned from search
   *
   * @param {String} id
   * @returns {Object}
   */
  getSearchResult(id) {
    return this.store.data.search.get(id);
  }

}

const model = new OrganizationModel();
export default model;
