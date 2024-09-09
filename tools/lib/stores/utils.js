import utils from '../utils.js';

class StoreUtils {

  getAppPayload(ido, args={}, state) {
    let id = utils.getIdPath(ido);

    if( !state ) {
      if( args.error !== undefined ) state = 'ERROR';
      else if( args.request !== undefined ) state = 'LOADING';
      else if( args.payload !== undefined ) state = 'LOADED';
      else throw new Error('No state provided');
    }

    return {
      id,
      database : ido.db,
      instance : ido.instance,
      organization : ido.org,
      schema : ido.schema,
      table : ido.table,
      user : ido.user,
      action : ido.action,
      state,
      request: args.request,
      payload: args.payload,
      error: args.error
    };
  }

}

const storeUtils = new StoreUtils();
export default storeUtils;