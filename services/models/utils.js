import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';
import { fileURLToPath } from 'url';
import exec from '../lib/exec.js';

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

  /**
   * @method awaitForGsFuseSync
   * @description Waits for a local file to sync with a GCS file.  This checks 
   * the crc32c hash of the file on both the local filesystem and GCS. It will
   * resolve when the crc32c hashes match.
   * 
   * @param {String} localFile full path to local fs file
   * @param {String} gcsFile full path to GCS file, including gs:// prefix
   * @param {Number} timeout time in seconds to wait before rejecting.  Default is 300 seconds (5min).
   * 
   * @returns 
   */
  awaitForGsFuseSync(localFile, gcsFile, timeout=300) {
    return new Promise((resolve, reject) => {
      let opts = {resolve, reject};

      setTimeout(() => {
        opts.cancelled = true;
      }, timeout * 1000);

      this.checkForGsFuseSync(localFile, gcsFile, opts);
    });
  }

  async checkForGsFuseSync(localFile, gcsFile, opts={}) {
    let localResp = await this.runGsutils(`hash ${localFile}`);
    let props = localResp[Object.keys(localResp)[0]];
    let localCrc32c = props['Hash (crc32c)'];

    let gcsResp = await this.runGsutils(`ls -L ${gcsFile}`);
    props = gcsResp[Object.keys(gcsResp)[0]];
    let gcsCrc32c = props['Hash (crc32c)'];


    if (localCrc32c === gcsCrc32c) {
      return opts.resolve(true);
    }

    if( opts.cancelled ) {
      return opts.reject(false);
    }

    setTimeout(() => {
      this.checkForGsFuseSync(localFile, gcsFile, opts);
    }, 1000);
  }


  /**
   * @method runGsutils
   * @description Runs a gsutil command and returns the stdout
   * as JSON.
   * 
   * @param {String} cmd gsutil command to run.  
   */
  async runGsutils(cmd='') {
    cmd.replace(/^gsutil/, '');
    let {stdout, stderr} = await exec(`gsutil ${cmd}`);
    return yaml.load(stdout.replace(/\t/g, '  '));
  }
}

const instance = new ModelUtils();
export default instance;