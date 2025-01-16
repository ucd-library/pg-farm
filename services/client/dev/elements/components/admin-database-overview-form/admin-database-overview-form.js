import { LitElement } from 'lit';
import {render, styles} from "./admin-database-overview-form.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';

export default class AdminDatabaseOverviewForm extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      db: {type: Object},
      isFeatured: {type: Boolean},
      payload: {state: true}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);
    this.db = {};
    this.isFeatured = false;

    this.idGen = new IdGenerator({randomPrefix: true});
  }

  willUpdate(props){
    if ( props.has('db') || props.has('isFeatured') ) {
      this.payload = {
        title: this.db?.title || '',
        shortDescription: this.db?.shortDescription || '',
        description: this.db?.description || '',
        isFeatured: this.isFeatured || false,
        brandColor: this.db?.brandColor || '',
        icon: this.db?.icon || '',
        tags: Array.isArray(this.db?.tags) ? [...this.db.tags] : []
      };
    }
  }

  _onSubmit(e){
    e.preventDefault();
  }

  _onInput(prop, value){
    if ( prop === 'brandColor' && value === 'secondary' ) {
      value = '';
    }
    if ( prop === 'tags' ) {
      value = value.split(',').map(tag => tag.trim());
    }
    this.payload[prop] = value;
    this.requestUpdate();
  }

  checkValidity(){
    return this.renderRoot.querySelector('form').checkValidity();
  }

  reportValidity(){
    return this.renderRoot.querySelector('form').reportValidity();
  }


}

customElements.define('admin-database-overview-form', AdminDatabaseOverviewForm);
