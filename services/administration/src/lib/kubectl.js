import exec from './exec.js'
import yaml from 'js-yaml';

class KubectlWrapper {


  async getClusters() {
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
  apply(file, opts={}  ) {
    if( opts.isJson || typeof file === 'object' ) {
      file = yaml.safeDump(file);
    }

    let output = '';
    if ( opts.stdin ) {
      output = this.exec(`kubectl apply -f - -o json`, {}, { input: file });
    } else {
      output = this.exec(`kubectl apply -f ${file} -o json`);
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

}

const instance = new KubectlWrapper();
export default instance;