import { LitElement } from 'lit';
import {render, styles} from "./admin-table-access-dropdown.tpl.js";

export default class AdminTableAccessDropdown extends LitElement {

  static get properties() {
    return {
      value: { type: String },
      disabled: { type: Boolean },
      opened: { type: Boolean },
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.value = '';
    this.disabled = false;
    this.opened = false;

    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleOutsideClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._handleOutsideClick);
    super.disconnectedCallback();
  }

  _handleOutsideClick(e) {
    if (!this.contains(e.target)) {
      this.opened = false;
      this.classList.remove('opened');
    }
  }

  _onToggleOpen() {
    this.opened = !this.opened;
    if (this.opened) {
      this.classList.add('opened');
    } else {
      this.classList.remove('opened');
    }
  }

  _onSelectChange(e) {
    this.value = e.currentTarget.dataset.type;
   
    this.dispatchEvent(new CustomEvent('option-change', {
      detail: {
        value: e.currentTarget.dataset.grant
      }
    }));
  }

}

customElements.define('admin-table-access-dropdown', AdminTableAccessDropdown);
