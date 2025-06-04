import { getLogger } from '@ucd-lib/cork-app-utils';

/**
 * @description Utility class for retrieving value labels from a predefined list
 */
class LabelGetter {

  constructor() {
    this.logger = getLogger('LabelGetter');
    this._labels = {};
  }

  /**
   * @description Registers a new type with its associated labels.
   * This allows for dynamic retrieval of labels based on the type and key.
   * @param {String} type - The type of label to register (must be a string). Will be used as a method name on the instance.
   * @param {Object} labels - An object containing key-value pairs for labels.
   * @returns
   */
  registerType(type, labels){
    if ( !type || typeof type !== 'string' ){
      this.logger.error('Type must be a string');
      return;
    }
    if ( !labels || typeof labels !== 'object' ){
      this.logger.error('Labels must be an object');
      return;
    }
    if ( this._labels[type] ){
      this.logger.warn(`Labels for type ${type} already registered, overwriting`);
    }
    this._labels[type] = labels;
    this[type] = (key) => {
      return this._getLabel(type, key);
    }
  }

  getLabels(type, asArray){
    if ( !this._labels[type] ){
      this.logger.warn(`No labels registered for type: ${type}`);
      return asArray ? [] : {};
    }
    if ( asArray ){
      return Object.entries(this._labels[type]).map(([value, label]) => ({value, label}));
    }
    return this._labels[type];

  }

  _getLabel(type, key){
    if ( !this._labels[type] ){
      this.logger.warn(`No labels registered for type: ${type}`);
      return key;
    }
    if ( !key ) return '';
    if ( !this._labels[type][key] ){
      //this.logger.info(`No label registered for type: ${type}, key: ${key}`);
      return key;
    }
    return this._labels[type][key];
  }

}

const labelGetter = new LabelGetter();

labelGetter.registerType('tableType', {
  'BASE TABLE': 'Table',
  'VIEW': 'View'
});


export default labelGetter;
