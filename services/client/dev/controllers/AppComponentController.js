import { Registry } from '@ucd-lib/cork-app-utils';

/**
 * @description Controller for app components
 * @property {HTMLElement} host - The host element
 * @property {String} parentPageId - The page-id of the application parent page (the direct child of ucdlib-pages element)
 * @property {HTMLElement} parentPage - The parent page element
 */
export default class AppComponentController {

  constructor(host){
    this.host = host;
    host.addController(this);
    this.AppStateModel = Registry.getModel('AppStateModel');

    this.parentPageId = null;
    this.parentPage = null;
  }

  hostConnected(){
    this._setParentPage();
  }

  _setParentPage(){
    let el = this.host;
    while( el ) {
      const p = el.getAttribute('page-id');
      if ( p ){
        this.parentPageId = p;
        this.parentPage = el;
        return el;
      }
      if ( el.parentElement ){
        el = el.parentElement;
      } else if ( el.parentNode?.host ) {
        el = el.parentNode.host;
      } else {
        return false;
      }
    }
  }

  get orgName(){
    const path = this.AppStateModel.store.data.location?.path || [];
    if ( path.length < 2 ) return;
    if ( path[0] !== 'db' ) return;
    return path[1];
  }

  get dbName(){
    const path = this.AppStateModel.store.data.location?.path || [];
    if ( path.length < 3 ) return;
    if ( path[0] !== 'db' ) return;
    return path[2];
  }
}
