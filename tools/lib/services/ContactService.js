import {BaseService} from '@ucd-lib/cork-app-utils';
import ContactStore from '../stores/ContactStore.js';
import serviceUtils from './utils.js';

class ContactService extends BaseService {

  constructor() {
    super();
    this.store = ContactStore;
    this.basePath = `${serviceUtils.host}/api/contact`;
    this.submitId = 0;
  }

  async submit(data) {
    let id = this.submitId++;

    await this.request({
      url : this.basePath,
      fetchOptions: {
        method : 'POST',
        body: data,
        headers: serviceUtils.authHeader()
      },
      json: true,
      onLoading: request => this.store.onSubmitUpdate(id, {request}),
      onLoad: payload => this.store.onSubmitUpdate(id, {payload: payload.body}),
      onError: error => this.store.onSubmitUpdate(id, {error})
    });

    return this.store.data.submit.get(id);
  }

}

const service = new ContactService();
export default service;
