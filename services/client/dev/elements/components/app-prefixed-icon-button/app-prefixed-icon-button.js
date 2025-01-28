import { LitElement } from 'lit';
import {render, styles} from "./app-prefixed-icon-button.tpl.js";

/**
 * @description Component for displaying a button with a prefixed icon
 * @prop {String} text - the text to display in the button. Can also be set via slot.
 * @prop {String} color - the color theme of the button. Can be 'dark', 'medium', or 'light'.
 * @prop {String} icon - the icon to display in the button. Must be a valid icon slug e.g. 'fa.solid.plus'.
 * @prop {String} href - optional. If set, the button will be a link to the provided href. Otherwise, a button element will be rendered.
 * @prop {Boolean} disabled - optional. If true, the button will be disabled.
 */
export default class AppPrefixedIconButton extends LitElement {

  static get properties() {
    return {
      text: { type: String },
      color: { type: String },
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
    this.text = '';
    this.color = '';
    this.icon = '';
    this.href = '';
    this.disabled = false;
  }

  willUpdate(props){
    const colors = ['dark', 'medium', 'light'];
    if ( props.has('color') && !colors.includes(this.color)){
      this.color = 'light';
    }
  }

  _onSlotChange(e){
    const childNodes = e.target.assignedNodes({flatten: true});
    const text = childNodes.map((node) => {
      return node.textContent ? node.textContent : ''
    }).join('').trim();
    if ( !text ) return;
    this.text = text;
  }

}

customElements.define('app-prefixed-icon-button', AppPrefixedIconButton);
