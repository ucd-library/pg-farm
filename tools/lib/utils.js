import { clearCache } from '@ucd-lib/cork-app-utils';

const ID_ORDER = ['org', 'instance', 'db', 'schema', 'schemaTable', 'table', 'user', 'action', 'access'];

class Utils {
  getIdPath(ido={}) {
    let id = [];

    if( !ido.org ) {
      ido.org = '_';
    }

    for( let prop of ID_ORDER ) {
      if( ido[prop] !== undefined ) {
        id.push(ido[prop]);
      }
    }

    return id.join('/');
  }

  clearCache(opts={}){
    const defaultOpts = { skipModels: ['IconModel', 'AppStateModel'] };
    clearCache({ ...defaultOpts, ...opts });
  }
}


const utils = new Utils();
export default utils;
