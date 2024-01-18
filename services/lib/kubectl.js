import exec from './exec.js'
import yaml from 'js-yaml';
import config from './config.js';
import logger from './logger.js';

class KubectlWrapper {

  constructor() {
    this.initalized = false;
    this.init();
  }

  async init() {
    if( this.initalized ) return;
    if( this.initializing ) return this.initializing;

    this.initializing = new Promise(async (resolve, reject) => {  
      if( config.k8s.platform === 'gke' ) {
        try {
          await this._initGke();
        } catch(e) {
          return reject(e);
        }
      } else {
        return reject('Unsupported kubernetes platform: '+config.k8s.platform);
      }

      logger.info('kubectl initialized');
      this.initalized = true;
      this.initializing = null;
      resolve();
    });

    await this.initializing;
  }

  async _initGke() {
    logger.info('initializing kubectl for gke');

    await exec(`gcloud auth login --quiet --cred-file=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

    await exec(`
      gcloud container clusters get-credentials ${config.k8s.cluster} \
        --zone ${config.gc.gke.zone} \
        --project ${config.gc.projectId}
    `);
  }

  async getClusters() {
    await this.init();
    let stdout = await exec('kubectl config get-clusters');
    return stdout.split('\n').filter((line) => line.trim() !== '');
  }

  /**
   * @method setContext
   * @description Set the current kubernetes context (cluster name)
   * 
   * @param {String} context context to set 
   * @returns {Promise<String>}
   */
  async setContext(context) {
    await this.init();
    let stdout = await exec(`kubectl config use-context ${context}`);
    return stdout.trim();
  }

  /**
   * @method currentContext
   * @description Get the current kubernetes context
   * 
   * @returns {Promise<String>} current context
   */
  async currentContext() {
    await this.init();
    let stdout = await exec('kubectl config current-context');
    return stdout.trim();
  }

  /**
   * @method apply
   * @description Apply a kubernetes configuration.  Can be file or stdin. Stdin can be a 
   * json object or yaml string. Returns the json output of the apply command.
   * 
   * @param {String|Object} file file path or stdin contents 
   * @param {Object} opts flags to control input type 
   * @param {Boolean} opts.stdin true if file is configuration json or yaml string
   * @param {Boolean} opts.isJson true if file is json object.  If input file is json object,
   * it will be converted to yaml string without the need of this flag.
   * @returns {Promise<Object>}
   */
  async apply(file, opts={}  ) {
    await this.init();

    if( opts.isJson || typeof file === 'object' ) {
      file = yaml.dump(file);
    }

    let output = '';
    if ( opts.stdin ) {
      output = await this.exec(`kubectl apply -f - -o json`, {}, { input: file });
    } else {
      output = await this.exec(`kubectl apply -f ${file} -o json`);
    }

    return JSON.parse(output);
  }

  async exec(command, args={}, options) {
    let {stdout, stderr} = await exec(command, args, options);
    if( stderr ) {
      throw new Error(stderr);
    }
    return stdout;
  }

  async delete(type, name) {
    await this.init();
    return this.exec(`kubectl delete ${type} ${name}`);
  }

}

const instance = new KubectlWrapper();
export default instance;