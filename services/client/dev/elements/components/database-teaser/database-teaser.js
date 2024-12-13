import { LitElement } from 'lit';
import { categoryBrands } from "@ucd-lib/theme-sass/colors";
import {render, styles} from "./database-teaser.tpl.js";

export default class DatabaseTeaser extends LitElement {

  static get properties() {
    return {
      data: { type: Object },
      defaultIcon: { type: String },
      defaultBrandColor: { type: String },
      featured: { type: Boolean },
      _brandColorHex: { state: true }
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
    this.defaultBrandColor = '';
    this.featured = false;
  }

  willUpdate(props) {
    if (props.has('data') || props.has('defaultBrandColor')) {
      let color = Object.values(categoryBrands).find(c => c.id === this.data.brandColor || this.defaultBrandColor);
      if ( !color ) color = categoryBrands.secondary;
      this._brandColorHex = color.hex
    }
  }

}

customElements.define('database-teaser', DatabaseTeaser);
