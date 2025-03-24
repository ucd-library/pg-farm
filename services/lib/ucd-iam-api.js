import config from "./config.js";
import fetch from "node-fetch";

/**
 * @description Class for interacting with the UCD IAM API
 */
class UcdIamApi {

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

  async _fetch(path, urlParams={}, fetchOpts={}) {
    urlParams = new URLSearchParams(urlParams);
    if ( !urlParams.get('key') ) urlParams.set('key', config.ucdIamApi.key);
    if ( !urlParams.get('v') ) urlParams.set('v', config.ucdIamApi.version);
    const url = `${config.ucdIamApi.url}${path}?${urlParams.toString()}`;
    return fetch(url, fetchOpts);
  }
}

export default new UcdIamApi();
