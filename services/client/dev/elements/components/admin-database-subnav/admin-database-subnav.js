import { LitElement } from 'lit';
import {render, styles} from "./admin-database-subnav.tpl.js";
import {Mixin} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

/**
 * @description Subnav component for database admin section.
 * Links are generated based on the current app state.
 */
export default class AdminDatabaseSubnav extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      heading: { type: String },
      items: { type: Array },
      orgName: { type: String},
      dbName: { type: String}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.heading = 'Database Settings';
    this.orgName = '';
    this.dbName = '';

    this.items = [];

    this._injectModel('AppStateModel');
  }

  /**
   * @description Callback for when the app state is updated
   * @param {Object} e - app state update event
   * @returns
  */
  async _onAppStateUpdate(e){
    if ( e.location?.path?.[0] !== 'db' ) return;
    this.orgName = e.location?.path?.[1] || '';
    this.dbName = e.location?.path?.[2] || '';
    this.dbSetting = e.location?.path?.[4] || '';
    this.dbSettingFiltered = e.location?.path?.[5] || '';
    this.items = this.getItems(e);
  }

  getItems(appState){
    const dbUrl = `/db/${this.orgName}/${this.dbName}`;
    const adminUrl = `${dbUrl}/edit`;
    let schema = this.AppStateModel.location.query?.schema || '';
    if( schema ) schema = `?schema=${schema}`;

    const dbItems = [
      {label: 'Overview', icon: 'fa.solid.magnifying-glass-chart', href: adminUrl},
      {label: 'Schemas', icon: 'fa.solid.diagram-project', href: `${adminUrl}/schemas`},
      {label: 'Users', icon: 'fa.solid.user', href: `${adminUrl}/users${schema}`},
      {label: 'Tables', icon: 'fa.solid.table', href: `${adminUrl}/tables${schema}`},
    ];

    if( this.dbSettingFiltered ) {
      const parentNavItem = dbItems.find(item => item.href.split('?')[0] === `${adminUrl}/${this.dbSetting}`);
      if( parentNavItem ) {
        parentNavItem.children = [{
          label: this.dbSettingFiltered, 
          icon: 'fa.solid.arrow-turn-up', 
          href: `${adminUrl}/${this.dbSetting}/${this.dbSettingFiltered}${schema}`,
          transformDegrees: '90',
          indented: true
        }];
      }
    }

    return dbItems;
  }

  async selectedFn(item){
    const state = await this.AppStateModel.get();
    const path = '/' + state.location.path.join('/');
    return item.href.split('?')[0] === path;
  }

}

customElements.define('admin-database-subnav', AdminDatabaseSubnav);
