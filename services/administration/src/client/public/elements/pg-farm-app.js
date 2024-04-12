import { LitElement } from 'lit';
import {render, styles} from "./pg-farm-app.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

// sets globals Mixin and EventInterface
import "@ucd-lib/cork-app-utils";
import '@ucd-lib/theme-elements/ucdlib/ucdlib-pages/ucdlib-pages.js';


export default class PgFarmApp extends Mixin(LitElement)
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

customElements.define('pg-farm-app', PgFarmApp);