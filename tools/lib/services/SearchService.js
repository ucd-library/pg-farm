import {BaseService} from '@ucd-lib/cork-app-utils';
import SearchStore from '../stores/SearchStore.js';

class SearchService extends BaseService {

  constructor() {
    super();
    this.store = SearchStore;
    this.BASE_PATH = '/api/db';
  }

  search(params) {
    return this.request({
      url : `${this.BASE_PATH}`,
      fetchOptions : {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify(params)
      }
    });
  }

}

const service = new SearchService();
export default service;