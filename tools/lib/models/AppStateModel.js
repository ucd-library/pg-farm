import {AppStateModel} from '@ucd-lib/cork-app-state';
import AppStateStore from '../stores/AppStateStore.js';
import clone from 'clone';
import {config} from '../config.js';

class AppStateModelImpl extends AppStateModel {

  constructor() {
    super();
    this.store = AppStateStore;

    this.init(config.appRoutes);
  }

  set(update) {
    if( update.location ) {
      update.lastLocation = clone(this.store.data.location);

      let page = update.location.path ? update.location.path[0] : 'home';
      if( !page ) page = 'home'

      if ( page === 'org' && update.location.path.length > 1 ) {
        page = 'org-single';
      }

      if ( page === 'db' && update.location.path?.[3] === 'edit' ) {
        page = 'admin-db-overview';
      }

      update.page = page;
    }

    return super.set(update);
  }

  refresh(){
    const state = this.store.data;
    this.store.emit(this.store.events.APP_STATE_UPDATE, state);
  }

  showLoading(){
    this.store.emit(this.store.events.APP_LOADING_UPDATE, {show: true});
  }

  hideLoading(){
    this.store.emit(this.store.events.APP_LOADING_UPDATE, {show: false});
  }

  /**
   * @description show an error message
   * @param {Object} opts - error message options
   * @param {String} opts.errors - array of errors with expected format from PageDataController
   * @param {String} opts.error - A single cork-app-utils error object if only one error
   * @param {String} opts.message - A single error message if only one error. Optional.
   */
  showError(opts){
    this.store.emit(this.store.events.APP_ERROR_UPDATE, {show: true, opts});
  }

  hideError(){
    this.store.emit(this.store.events.APP_ERROR_UPDATE, {show: false});
  }

  /**
   * @description Show a modal dialog box.
   * To listen for the action event, add the _onDialogAction method to your element and then filter on e.action
   * @param {Object} options Dialog object with the following properties:
   * - title {TemplateResult} - The title of the dialog (optional)
   * - content {TemplateResult} - The html content of the dialog (optional, but should probably be included)
   * - actions {Array} - Array of objects with the following properties:
   *  - text {String} - The text of the button
   *  - value {String} - The action slug that is emitted when button is clicked
   *  - invert {Boolean} - Invert the button color (optional)
   *  - color {String} - The brand color string of the button (optional)
   *  - disableOnLoading {Boolean} - Disable the button when the modal is in a loading state (optional)
   * - data {Object} - Any data to pass along in the action event (optional)
   * - actionCallback {Function} - A callback function to run when the action is clicked (optional).
   *     The function will be passed the action object and the modal element instance.
   *     The function should return an object with an abortModalAction property set to true to prevent the modal from closing.
   *
   * If the actions array is empty, a 'Dismiss' button will be added automatically
   */
  showDialogModal(options={}){
    if ( !options.actions ) {
      options.actions = [{text: 'Cancel', value: 'dismiss', invert: true, color: 'secondary'}];
    }
    if ( !options.data ) {
      options.data = {};
    }
    if ( !options.title ) {
      options.title = '';
    }
    if ( !options.content ) {
      options.content = '';
    }
    this.store.emit('app-dialog-open', options);
  }

}

const model = new AppStateModelImpl();
export default model;
