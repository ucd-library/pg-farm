import {BaseModel} from '@ucd-lib/cork-app-utils';
import ContactService from '../services/ContactService.js';
import ContactStore from '../stores/ContactStore.js';

class ContactModel extends BaseModel {

  constructor() {
    super();

    this.store = ContactStore;
    this.service = ContactService;

    this.register('ContactModel');
  }

  async submit(data) {
    return this.service.submit(data);
  }

}

const model = new ContactModel();
export default model;
