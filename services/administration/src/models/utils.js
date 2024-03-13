import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let k8sTemplatePath = path.join(__dirname, '..', '..', 'k8s');

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
    let templatePath = path.join(k8sTemplatePath, template+'.yaml');
    let k8sConfig = yaml.load(fs.readFileSync(templatePath, 'utf-8'));
    return k8sConfig;
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
}

const instance = new ModelUtils();
export default instance;