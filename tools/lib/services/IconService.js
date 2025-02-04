import {BaseService} from '@ucd-lib/cork-app-utils';
import IconStore from '../stores/IconStore.js';
import serviceUtils from './utils.js';

class IconService extends BaseService {

  constructor() {
    super();
    this.store = IconStore;
    this.basePath = `${serviceUtils.host}/api/icon`;
  }

  async search(term) {
    const requestStore = this.store.data.search;
    await this.checkRequesting(
      term, requestStore,
      () => this.request({
        url : `${this.basePath}/search/${term}`,
        fetchOptions: {
          headers: serviceUtils.authHeader()
        },
        checkCached: () => requestStore.get(term),
        onUpdate: resp => this.store.set({id: term, ...resp}, requestStore)
      })
    );
    return requestStore.get(term);
  }

  async get(slugs){
    if ( !Array.isArray(slugs) ) slugs = [slugs];
    slugs.sort();
    let id = slugs.join(',');

    const requestStore = this.store.data.get;
    const svgStore = this.store.data.svgs;

    await this.checkRequesting(
      id, requestStore,
      () => this.request({
        url : `${this.basePath}/batch/${id}`,
        fetchOptions: {
          headers: serviceUtils.authHeader()
        },
        checkCached: () => requestStore.get(id),
        onUpdate: resp => {
          this.store.set({...resp, id},requestStore);
          const payload = resp?.payload || {};
          Object.keys(payload).forEach(slug => {
            if ( payload[slug] ) {
              svgStore.set(slug, payload[slug]);
            }
          });

        }
      })
    );
    return requestStore.get(id);
  }

}

const service = new IconService();
export default service;
