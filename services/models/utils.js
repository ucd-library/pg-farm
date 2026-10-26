import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import kubectl from '../lib/kubectl.js';
import config from '../lib/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let k8sTemplatePath = path.join(__dirname, '..', 'administration', 'k8s');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ModelUtils {

  /**
   * @method getTemplate
   * @description Returns a k8s template object
   * 
   * @param {String} template
   *  
   * @returns {Object}
   */
  getTemplate(template) {
    return kubectl.renderKustomizeTemplate(template, config.k8s.platform);
  }

    /**
   * @method cleanTemplateForLocalDev
   * @description Clean the k8s template for local development.  This will remove things
   * like always pull images and resource limits.  Only runs if config.k8s.platform is docker-desktop
   * 
   * @param {Object} template 
   */
  cleanTemplateForLocalDev(template) {
    if( config.k8s.platform !== 'docker-desktop' ) return;

    if( template?.spec?.template?.spec?.containers ) {
      let containers = template.spec.template.spec.containers;
      containers.forEach(container => {
        container.imagePullPolicy = 'Never';
        if( container.resources ) {
          delete container.resources;
        }
      });
    }

  }

  /**
   * @method isUUID
   * @description Returns true if the string is a UUID
   * 
   * @param {String} nameOrId variable to check
   * 
   * @returns {Boolean}
   */
  isUUID(nameOrId='') {
    return uuidRegex.test(nameOrId);
  };

  /**
   * @method cleanInstDbName
   * @description Cleans an instance database name.  
   * This will remove any special
   * 
   * @param {String} name name or title to clean
   * @returns 
   */
  cleanInstDbName(name) {
    return name
      .replace(/^inst-/, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-');
  }

  getInstanceName(name) {
    if( this.isUUID(name) ) {
      return name;
    }
    if( name.startsWith('inst-') ) {
      return name;
    }
    return `inst-${name}`;
  }

}

const instance = new ModelUtils();
export default instance;