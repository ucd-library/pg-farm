import {BaseService} from '@ucd-lib/cork-app-utils';
import IconStore from '../stores/IconStore.js';
import serviceUtils from './utils.js';

class IconService extends BaseService {

  constructor() {
    super();
    this.store = IconStore;
    this.basePath = `${serviceUtils.host}/api/icon`;
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
        url : `${this.basePath}/${id}`,
        fetchOptions: {
          headers: serviceUtils.authHeader()
        },
        checkCached: () => requestStore.get(id),
        onUpdate: resp => {
          this.store.set({...resp, id},requestStore);
          if ( resp?.state === 'loaded' ){
            const payload = resp?.payload?.data || {};
            Object.keys(payload).forEach(slug => {
              if ( payload[slug] ) {
                svgStore.set(slug, payload[slug]);
              }
            });
          }
        }
      })
    );
    return requestStore.get(id);
  }

}

const service = new IconService();
export default service;
