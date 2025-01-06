import { LitElement } from 'lit';
import { render, styles } from "./app-organizations.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

export default class AppOrganizations extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      pageId: {type: String, attribute: 'page-id'}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this._injectModel('AppStateModel');
  }

  /**
   * @description Callback for when the app state is updated
   * @param {Object} e - app state update event
   * @returns
   */
  _onAppStateUpdate(e){
    if ( e.page !== this.pageId ) return;
    this.AppStateModel.hideLoading();
  }

}

customElements.define('app-organizations', AppOrganizations);
