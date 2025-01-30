import { LitElement } from 'lit';
import {render, styles} from "./app-dropdown-button.tpl.js";

export default class AppDropdownButton extends LitElement {

  static get properties() {
    return {
      options: { type: Array },
      buttonText: { type: String, attribute: 'button-text' },
      value: { type: String },
      placeholder: { type: String }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.options = [];
    this.buttonText = '';
    this.value = '';
    this.placeholder = '';
  }

  _onSubmit(e) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('apply', {
      detail: {
        value: this.value
      }
    }));
  }

  _onSelectChange(e) {
    this.value = e.target.value;
    this.dispatchEvent(new CustomEvent('option-change', {
      detail: {
        value: this.value
      }
    }));
  }

}

customElements.define('app-dropdown-button', AppDropdownButton);
