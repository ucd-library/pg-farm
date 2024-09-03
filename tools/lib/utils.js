const ID_ORDER = ['org', 'db', 'schema', 'table', 'user'];

class Utils {
  getIdPath(ido={}) {
    let id = [];

    if( !ido.org ) {
      ido.org = '_';
    }

    for( let prop of ID_ORDER ) {
      if( args[prop] !== undefined ) {
        id.push(args[prop]);
      }
    }

    return id.join('/');
  }
}

const utils = new Utils();
export default utils;