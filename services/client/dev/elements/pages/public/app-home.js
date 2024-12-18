import { LitElement } from 'lit';
import {render, styles} from "./app-home.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';


export default class AppHome extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {


  static get properties() {
    return {
      pageId: { type: String, attribute: 'page-id' },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.features = [
      {
        title: `Free Database Hosting`,
        description: `Hosting is free for projects up to 50 GB. Pricing for larger projects is evaluated case by case.`,
        icon: 'fa.solid.database'
      },
      {
        title: `UC Davis Authenticated`,
        description: 'Integration with the UC Davis Campus Authentication Service (CAS) simplifies managing access to your data.',
        icon: 'fa.solid.user-lock'
      },
      {
        title: `24/7 Access`,
        description: `Access your data anytime so your team’s work can continue uninterrupted.`,
        icon: 'fa.solid.clock'
      },
      {
        title: `Flexible User Permissions`,
        description: `Whether you want to lock access to your own team or make your data public to world, PG-Farm provides easy access management.`,
        icon: 'fa.solid.user-group'
      },
      {
        title: `Backed Up and Secure`,
        description: `PG-Farm backs up your data and handles security updates and software upgrades for you.`,
        icon: 'fa.solid.lock'
      },
      {
        title: `Access for Web Portals and Applications`,
        description: `PG-Farm can enable and maintain access for web portals and applications designed to operate with your data.`,
        icon: 'fa.solid.door-open'
      }
    ];

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

customElements.define('app-home', AppHome);
