import utils from '../utils.js';

class StoreUtils {

  getAppPayload(ido, args={}, state) {
    let id = utils.getIdPath(ido);

    if( !state ) {
      if( args.error ) state = 'ERROR';
      else if( args.request ) state = 'LOADING';
      else if( args.payload ) state = 'LOADED';
      else throw new Error('No state provided');
    }

    return {
      id : id.join('/'),
      database : ido.db,
      organization : ido.org,
      schema : ido.schema,
      table : ido.table,
      user : ido.user,
      state,
      request: args.request,
      payload: args.payload,
      error: args.error
    };
  }

}

const storeUtils = new StoreUtils();
export default storeUtils;