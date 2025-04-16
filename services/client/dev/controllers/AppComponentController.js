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
}
