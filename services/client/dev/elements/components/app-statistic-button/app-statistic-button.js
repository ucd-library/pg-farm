import { LitElement } from 'lit';
import { categoryBrands } from "@ucd-lib/theme-sass/colors";
import {render, styles} from "./app-statistic-button.tpl.js";

/**
 * @description A large button component for displaying brief statistics.
 * @property {String} icon - The icon to display in the button. Must be a valid icon slug. e.g. 'fa.solid.users'
 * @property {String} href - The URL to link to when element is clicked. If not set, button element will be rendered, and you will need to handle the click event.
 * @property {String} text - The main text to display in the button.
 * @property {String} subtext - Smaller text to display below the main text.
 */
export default class AppStatisticButton extends LitElement {

  static get properties() {
    return {
      icon: { type: String },
      href: { type: String },
      text: { type: String },
      transformDegrees: { type: String },
      subtext: { type: String },
      brandColor: { type: String, attribute: 'brand-color' },
      _brandColorHex: { state: true }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.icon = '';
    this.href = '';
    this.text = '';
    this.transformDegrees = '0';
    this.subtext = '';
    this.brandColor = '';
    this._brandColorHex = '';
  }

  willUpdate(props) {
    if (props.has('brandColor')) {
      this._setColor();
    }
  }

  /**
   * @description Set theme color
   */
  _setColor(){
    let color = Object.values(categoryBrands).find(c => c.id === this.brandColor);
    if ( !color ) color = categoryBrands.secondary;
    this._brandColorHex = color.hex;
  }

}

customElements.define('app-statistic-button', AppStatisticButton);
