import {BaseModel} from '@ucd-lib/cork-app-utils';
import SearchService from '../services/SearchService.js';
import SearchStore from '../stores/SearchStore.js';

class SearchModel extends BaseModel {

  constructor() {
    super();

    this.store = SearchStore;
    this.service = SearchService;
      
    this.register('SearchModel');
  }

  /**
   * @method search
   * @description search for databases
   * 
   * @param {Object} params
   * @param {String} params.text search text
   * @param {String} params.tags search tags
   * @param {String} params.organization filter to organization
   * @param {Number} params.limit limit number of results, default 10
   * @param {Number} params.offset offset results, default 0
   * @param {Boolean} params.onlyMine only search databases user has access to
   *  
   * @returns {Object}
   */
  search(params) {
    return this.service.search(params);
  }

}

const model = new SearchModel();
export default model;