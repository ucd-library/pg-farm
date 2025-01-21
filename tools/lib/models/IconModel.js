import {BaseModel} from '@ucd-lib/cork-app-utils';
import IconService from '../services/IconService.js';
import IconStore from '../stores/IconStore.js';

class IconModel extends BaseModel {

  constructor() {
    super();

    this.store = IconStore;
    this.service = IconService;

    this.debounceTime = 500;
    this.debouncer = null;
    this.batchedIconSlugs = new Set();

    this.register('IconModel');
  }

  /**
   * @description Retrieve the svg for a given icon slug.
   * By default, this method batches requests to the server
   * @param {(string|string[])} iconSlugs - A single icon slug or an array of icon slugs
   * e.g. fa.solid.user
   * @param {Object} opts - Optional params
   * @param {boolean} opts.noDebounce - If true, don't debounce the request.
   * @returns
   */
  async get(iconSlugs, opts){

    // get slugs we don't have in cache
    const slugSet = new Set();
    if ( !Array.isArray(iconSlugs) ) iconSlugs = [iconSlugs];
    iconSlugs.forEach(slug => {
      if ( !this.store.data.svgs.get(slug) ) {
        slugSet.add(slug);
      }
    })

    if ( opts?.noDebounce ) {
      if ( slugSet.size ) {
        await this.service.get([...slugSet]);
      }
      return this.getFromCache(iconSlugs);
    }

    // add new slugs to batch
    slugSet.forEach(slug => this.batchedIconSlugs.add(slug));
    if ( typeof this.debouncer instanceof Promise ) {
      await this.debouncer;
    } else {
      this.debouncer = await (async () => {
        await new Promise(resolve => setTimeout(resolve, this.debounceTime));
        while ( this.batchedIconSlugs.size ) {
          const slugs = [...this.batchedIconSlugs];
          this.batchedIconSlugs.clear();
          await this.service.get(slugs);
        }
      })();
    }
    return this.getFromCache(iconSlugs);
  }

  /**
   * @description Get icon svgs from model store
   * @param {(string|string[])} iconSlug - A single icon slug or an array of icon slugs
   * @returns {Object} - An object with the icon slugs as keys and the svgs as values
   */
  getFromCache(iconSlug){
    const out = {};
    if ( !Array.isArray(iconSlug) ) iconSlug = [iconSlug];
    iconSlug.forEach(slug => {
      out[slug] = this.store.data.svgs.get(slug);
    });
    return out;
  }

}

const model = new IconModel();
export default model;
