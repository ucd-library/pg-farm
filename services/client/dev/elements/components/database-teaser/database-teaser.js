import { LitElement } from 'lit';
import { categoryBrands } from "@ucd-lib/theme-sass/colors";
import {render, styles} from "./database-teaser.tpl.js";

export default class DatabaseTeaser extends LitElement {

  static get properties() {
    return {
      data: { type: Object },
      defaultIcon: { type: String, attribute: 'default-icon' },
      defaultBrandColor: { type: String, attribute: 'default-brand-color' },
      hideOrganization: { type: Boolean, attribute: 'hide-organization' },
      featured: { type: Boolean },
      descriptionMaxWords: { type: Number, attribute: 'description-max-words' },
      featuredLabel: { type: String, attribute: 'featured-label' },
      _brandColorHex: { state: true },
      _organization: { state: true },
      _description: { state: true }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.data = {};
    this.defaultIcon = 'fa.solid.database';
    this.featuredLabel = 'featured';
    this.defaultBrandColor = '';
    this.featured = false;
    this.hideOrganization = false;
    this.descriptionMaxWords = 35;
  }

  willUpdate(props) {
    if (props.has('data') || props.has('defaultBrandColor')) {
      this._setColor();
    }
    if ( props.has('data') ) {
      this._setOrganization();
    }
    if ( props.has('data') || props.has('descriptionMaxWords') ) {
      this._setDescription();
    }
  }

  _setOrganization() {
    this._organization = this.data.organization?.title || '';
  }

  /**
   * @description Set the teaser color based on the database brand color or the default brand color
   */
  _setColor(){
    let color = Object.values(categoryBrands).find(c => c.id === (this.data.brandColor || this.defaultBrandColor));
    if ( !color ) color = categoryBrands.secondary;
    this._brandColorHex = color.hex;
  }

  _setDescription(){
    if ( this.data.shortDescription ) {
      this._description = this.data.shortDescription;
    } else if ( this.data.description ) {
      const d = this.data.description.split(' ');
      this._description = d.slice(0, this.descriptionMaxWords).join(' ') + (d.length > this.descriptionMaxWords ? '...' : '');
    } else {
      this._description = '';
    }
  }

}

customElements.define('database-teaser', DatabaseTeaser);
