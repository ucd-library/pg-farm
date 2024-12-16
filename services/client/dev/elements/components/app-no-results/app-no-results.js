import { LitElement } from 'lit';
import {render, styles} from "./app-no-results.tpl.js";

export default class AppNoResults extends LitElement {

  static get properties() {
    return {
      text: { type: String },
      subtext: { type: String }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.text = 'No results found';
    this.subtext = 'Please refine your search criteria and try again.';
  }

}

customElements.define('app-no-results', AppNoResults);
