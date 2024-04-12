import { LitElement } from 'lit';
import {render, styles} from "./pg-farm-page-home.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import config from '../../src/config.js';

export default class PgFarmPageHome extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      assetHost : {type: String},
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.assetHost = config.assetHost;
  }

}

customElements.define('pg-farm-page-home', PgFarmPageHome);