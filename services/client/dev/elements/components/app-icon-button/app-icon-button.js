import { LitElement } from 'lit';
import {render, styles} from "./app-icon-button.tpl.js";

/**
 * @description An icon button component. Use --app-icon-button-size variable to set the size of the element.
 * @property {String} color - The color theme of the button. Can be 'dark', 'medium', 'light', or 'white'.
 * @property {String} icon - The icon to display in the button. Must be a valid icon slug.
 * @property {String} href - Optional. If set, the button will be a link to the provided href. Otherwise, a button element will be rendered.
 * @property {Boolean} disabled - Optional. If true, the button will be disabled.
 */
export default class AppIconButton extends LitElement {

  static get properties() {
    return {
      color: { type: String },
      basic: { type: Boolean },
      icon: { type: String },
      href: { type: String },
      disabled: { type: Boolean }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.color = '';
    this.basic = false;
    this.icon = '';
    this.href = '';
    this.disabled = false;
  }

  willUpdate(props){
    const colors = ['dark', 'medium', 'light', 'white'];
    if ( props.has('color') && !colors.includes(this.color)){
      this.color = 'light';
    }
  }

}

customElements.define('app-icon-button', AppIconButton);
