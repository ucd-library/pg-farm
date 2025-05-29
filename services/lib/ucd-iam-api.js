import config from "./config.js";
import fetch from "node-fetch";

/**
 * @description Class for interacting with the UCD IAM API
 */
class UcdIamApi {

  /**
   * @description Get a user's profile from the UCD IAM API
   * @param {String} id - The user's id
   * @param {String} idType - The type of id to search for.  One of 'userId', 'iamId', or 'email'
   * @returns
   */
  async getUserProfile(id, idType='userId'){
    const path = '/people/profile/search';
    const idTypes = ['userId', 'iamId', 'email'];
    if ( !idTypes.includes(idType) ) {
      throw new Error(`Invalid idType: ${idType}.  Must be one of ${idTypes.join(', ')}`);
    }

    const urlParams = {
      [idType]: id
    };
    const res = await this._fetch(path, urlParams);
    const data = await res.json();
    return data?.responseData?.results?.[0] || null;
  }

  /**
   * @description Extract a user's positions from their directory listings
   * @param {Object} profile - The user's profile object from the UCD IAM API
   * @returns {Array} - An array of objects with 'dept' and 'title' keys
   */
  getPositions(profile){
    return (profile?.directory?.listings || [])
    .sort((a, b) => a?.listingOrder || 0 - b?.listingOrder || 0)
    .map(listing => {
      const d = {};
      if ( listing?.deptUcdFlag === 'Y' && listing?.deptName ) {
        d.dept = listing?.deptName;
      }
      if ( listing?.titleUcdFlag === 'Y' && listing?.title ) {
        d.title = listing?.title;
      }
      return d;
    })
    .filter(d => Object.keys(d).length > 0);
  }

  async _fetch(path, urlParams={}, fetchOpts={}) {
    urlParams = new URLSearchParams(urlParams);
    if ( !urlParams.get('key') ) urlParams.set('key', config.ucdIamApi.key);
    if ( !urlParams.get('v') ) urlParams.set('v', config.ucdIamApi.version);
    const url = `${config.ucdIamApi.url}${path}?${urlParams.toString()}`;
    return fetch(url, fetchOpts);
  }
}

export default new UcdIamApi();
