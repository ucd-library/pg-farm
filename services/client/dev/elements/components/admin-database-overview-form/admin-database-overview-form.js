import { LitElement } from 'lit';
import {render, styles} from "./admin-database-overview-form.tpl.js";
import {Mixin, MainDomElement} from '@ucd-lib/theme-elements/utils/mixins';
import { LitCorkUtils } from '@ucd-lib/cork-app-utils';

import IdGenerator from '../../../utils/IdGenerator.js';

/**
 * @description A form component for editing database overview (metadata) information.
 * Does not fetch data, must be passed in as a prop.
 * @prop {Object} db - database object
 * @prop {Boolean} isFeatured - whether or not the database is featured by organization
 * @prop {Object} payload - the current form data
 * @prop {Boolean} _loading - whether or not the form is loading
 */
export default class AdminDatabaseOverviewForm extends Mixin(LitElement)
  .with(MainDomElement, LitCorkUtils) {

  static get properties() {
    return {
      db: {type: Object},
      isFeatured: {type: Boolean},
      payload: {state: true},
      _loading: {type: Boolean}
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
    this._injectModel('DatabaseModel', 'AppStateModel');
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
    this.submit();
  }

  async submit(){
    this._loading = true;
    const makeFeatured = this.payload.isFeatured && !this.isFeatured;
    const removeFeatured = !this.payload.isFeatured && this.isFeatured;
    delete this.payload.isFeatured;

    const update = await this.DatabaseModel.update(this.db.organization.name, this.db.name, this.payload);
    if ( update.state === 'error' ){
      this._loading = false;
      return this.AppStateModel.showError({
        message: 'Unable to update database',
        error: update.error
      });
    }

    if ( makeFeatured ) {
      const r = await this.DatabaseModel.addToFeaturedList(this.db.organization.name, this.db.name, {organizationList: true});
      if( r.state === 'error' ){
        this._loading = false;
        return this.AppStateModel.showError({
          message: 'Unable to add database to featured list',
          error: r.error
        });
      }
    } else if ( removeFeatured ) {
      const r = await this.DatabaseModel.removeFromFeaturedList(this.db.organization.name, this.db.name, true);
      if( r.state === 'error' ){
        this._loading = false;
        return this.AppStateModel.showError({
          message: 'Unable to remove database from featured list',
          error: r.error
        });
      }
    }

    this._loading = false;
    return true;
  }

  _onInput(prop, value){
    if ( prop === 'brandColor' && value === 'secondary' ) {
      value = '';
    }
    if ( prop === 'icon' ){
      if ( value.iconExists || !value.value ){
        value = value.value;
      } else {
        return;
      }
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
