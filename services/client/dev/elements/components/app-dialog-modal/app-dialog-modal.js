import { LitElement } from 'lit';
import {render, styles} from "./app-dialog-modal.tpl.js";
import { LitCorkUtils, Mixin } from '@ucd-lib/cork-app-utils';
import { createRef } from 'lit/directives/ref.js';
import { MainDomElement } from "@ucd-lib/theme-elements/utils/mixins/main-dom-element.js";

/**
 * @description A dialog modal component that can be used to display a dialog with a title, content, and actions.
 * Use AppStateModel showDialogModal modal to open the dialog.
 * Listen for AppStateModel app-dialog-action event to handle dialog actions.
 */
export default class AppDialogModal extends Mixin(LitElement)
.with(LitCorkUtils, MainDomElement) {

  static get properties() {
    return {
      modalTitle: {type: String},
      modalContent: {type: String},
      actions: {type: Array},
      data: {type: Object},
      actionCallback: {state: true},
      contentMaxHeight: {type: String},
      _loading: {type: Boolean}
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.modalTitle = '';
    this.modalContent = '';
    this.actions = [];
    this.data = {};
    this.actionCallback = null;
    this.contentMaxHeight = '';
    this._loading = false;

    this.dialogRef = createRef();

    this._injectModel('AppStateModel');
  }

  connectedCallback(){
    super.connectedCallback();
    window.addEventListener('resize', this.setMaxHeight.bind(this));
  }

  disconnectedCallback(){
    super.disconnectedCallback();
    window.removeEventListener('resize', this.setMaxHeight.bind(this));
  }

  updated(){
    this.setMaxHeight();
  }

  /**
   * @description Sets max height of dialog content area based on viewport height.
   * So that modal header and buttons always remain visible.
   * @returns
   */
  setMaxHeight(){
    if ( !this.dialogRef.value.open ){
      return;
    }
    const viewportHeight = window.innerHeight;
    const dialogComputedStyle = window.getComputedStyle(this.dialogRef.value);
    const dialogMargin = parseInt(dialogComputedStyle.marginTop) + parseInt(dialogComputedStyle.marginBottom);
    const dialogPadding = parseInt(dialogComputedStyle.paddingTop) + parseInt(dialogComputedStyle.paddingBottom);
    const headingHeight = this.renderRoot.querySelector('.heading-wrapper').offsetHeight;
    const buttonsHeight = this.renderRoot.querySelector('.buttons-wrapper').offsetHeight;

    let maxHeight = viewportHeight - dialogMargin - dialogPadding - headingHeight - buttonsHeight;
    // round down to nearest 5px to prevent scrollbar flicker
    maxHeight = Math.floor(maxHeight / 5) * 5 + 'px';
    this.contentMaxHeight = maxHeight;
  }

  /**
   * @description Bound to AppStateModel dialog-open event
   * Will open the dialog modal with the provided title, content, and actions
  */
  _onAppDialogOpen(e){
    this.modalTitle = e.title;
    this.modalContent = e.content;
    this.actions = e.actions;
    this.data = e.data;
    this.actionCallback = e.actionCallback;
    this._loading = false;

    this.logger.info('Opening dialog modal', e);
    this.dialogRef.value.showModal();
    this.dialogRef.value.querySelector('.modal-content').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  /**
   * @description Bound to dialog button(s) click event
   * Will emit a dialog-action AppStateModel event with the action value and data
   * @param {String} action - The action value to emit
   */
  async _onButtonClick(actionValue){
    const action = this.actions.find(a => a.value === actionValue);
    if ( !action ) return;
    if ( action.disableOnLoading && this._loading ){
      return;
    }
    if ( this.actionCallback ){
      let cb = this.actionCallback(actionValue, this);
      if ( cb instanceof Promise ) {
        cb = await cb;
      }
      if ( cb?.abortModalAction ) return;
    }
    this.dialogRef.value.close();
    document.body.style.overflow = '';
    this.logger.info(`Dialog action: ${actionValue}`, this.data);
    this.AppStateModel.emit('app-dialog-action', {action, data: this.data});
  }

}

customElements.define('app-dialog-modal', AppDialogModal);
