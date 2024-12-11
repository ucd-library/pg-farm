import { LitElement } from 'lit';
import { render, styles } from "./app-features.tpl.js";
import { Mixin, MainDomElement } from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

export default class AppFeatures extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {

    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
  }

}

customElements.define('app-features', AppFeatures);
