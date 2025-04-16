import { LitElement } from 'lit';
import {render, styles} from "./org-teaser.tpl.js";
import { Mixin } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import { categoryBrands } from "@ucd-lib/theme-sass/colors";

export default class OrgTeaser extends Mixin(LitElement)
  .with(LitCorkUtils) {

  static get properties() {
    return {
      data: { type: Object },
      icon: { type: String },
      brandColor: { type: String, attribute: 'brand-color' },
      _orgTitle: { state: true },
      _brandColorHex: { state: true },
      _databaseCtText: { state: true },
      _logoSrc: { state: true }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.data = {};
    this.brandColor = '';

    this._injectModel('OrganizationModel');
  }

  willUpdate(props) {
    if ( props.has('data') ){
      this._orgTitle = this.data.title || this.data.name || '';
      this._databaseCtText = `${this.data.database_count || 0} database${this.data.databaseCount !== 1 ? 's' : ''}`;
      this._logoSrc = this.data.logo_file_type ? this.OrganizationModel.getLogoUrl(this.data.name) : '';
    }

    if ( props.has('brandColor') ){
      this._setColor();
    }
  }

  /**
   * @description Set the hex color based on the brand color slug
   */
  _setColor(){
    let color = Object.values(categoryBrands).find(c => c.id === this.brandColor);
    if ( !color ) color = categoryBrands.secondary;
    this._brandColorHex = color.hex;
  }

}

customElements.define('org-teaser', OrgTeaser);
