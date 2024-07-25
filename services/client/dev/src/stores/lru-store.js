import logger from '../logger.js';

class LruStore {

  /**
   * @constructor
   * 
   * @param {Object} opts
   * @param {String} opts.name name of the store
   * @param {Number} opts.maxSize max number of items to store in cache 
   */
  constructor(opts={}) {
    if( !opts.maxSize ) opts.maxSize = 50;

    this.logger = logger('lru-store');
    
    this.name = opts.name;
    this.maxSize = opts.maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const wrapper = this.cache.get(key);
    wrapper.lastUsed = Date.now();
    return wrapper.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value, 
      lastUsed: Date.now()
    });
  }

  clean() {
    if( this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this._clean();
    }, 1000);
  }

  _clean() {
    if( this.cache.size <= this.maxSize) return;

    let keyTime = [];
    this.cache.forEach((value, key) => {
      keyTime.push({key, lastUsed: value.lastUsed});
    });

    keyTime.sort((a, b) => a.lastUsed - b.lastUsed);

    for (let i = this.maxSize; i < keys.length; i++) {
      this.logger.info(this.name+' removing ', keys[i]);
      this.cache.delete(keys[i]);
    }
  }

}

module.exports = LruStore;