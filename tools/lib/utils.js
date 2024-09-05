const ID_ORDER = ['org', 'instance', 'db', 'schema', 'table', 'user'];

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
}

const utils = new Utils();
export default utils;