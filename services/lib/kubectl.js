import exec from './exec.js'
import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from './config.js';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let k8sTemplatePath = path.join(__dirname, '..', 'administration', 'k8s');

class KubectlWrapper {

  constructor() {
    this.initalized = false;
  }

  async init() {
    if( this.initalized ) return;


    if( config.k8s.platform === 'docker-desktop' ) {
      logger.info('kubectl initialized for local environment. /root/.kube should already be mounted');
      this.initalized = true;
      return;
    }

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
    let {stdout} = await exec('kubectl config get-clusters');
    return stdout.split('\n').filter((line) => line.trim() !== '');
  }

  async getPods() {
    await this.init();
    let {stdout} = await exec('kubectl get pods -o jsonpath-as-json="{.items[*].metadata.name}"');
    return JSON.parse(stdout);
  }

  async getServices() {
    await this.init();
    let {stdout} = await exec('kubectl get service -o jsonpath-as-json="{.items[*].metadata.name}"');
    return JSON.parse(stdout);
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
    let {stdout} = await exec(`kubectl config use-context ${context}`);
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
    let {stdout} = await exec('kubectl config current-context');
    return stdout.trim();
  }

  async restart(type, name) {
    await this.init();
    return this.exec(`kubectl rollout restart ${type} ${name}`);
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
      let lines = stderr.split('\n').filter(l => l.trim());
      let warnings = lines.filter(l => l.startsWith('Warning:'));
      let errors = lines.filter(l => !l.startsWith('Warning:'));

      if( warnings.length ) {
        logger.warn('kubectl warning', warnings.join('\n'));
      }
      if( errors.length ) {
        throw new Error(errors.join('\n'));
      }
    }
    return stdout;
  }

  async delete(type, name) {
    await this.init();
    return this.exec(`kubectl delete ${type} ${name}`);
  }

  /**
   * @method applyPdb
   * @description Create or update a PodDisruptionBudget for an instance pod.
   * minAvailable=1 blocks voluntary eviction (node drain, cluster upgrade).
   * minAvailable=0 allows GKE to freely move the pod when idle.
   *
   * @param {string} name instance hostname (used as pod app label selector)
   * @param {number} minAvailable 0 or 1
   * @returns {Promise<Object>}
   */
  async applyPdb(name, minAvailable) {
    await this.init();
    const pdb = {
      apiVersion : 'policy/v1',
      kind       : 'PodDisruptionBudget',
      metadata   : { name: `${name}-pdb` },
      spec       : {
        minAvailable,
        selector : { matchLabels: { app: name } }
      }
    };
    return this.apply(pdb, { stdin: true, isJson: true });
  }

  /**
   * @method deletePdb
   * @description Delete the PodDisruptionBudget for an instance. Silently ignores
   * a missing PDB so stop() is safe to call on instances created before this feature.
   *
   * @param {string} name instance hostname
   * @returns {Promise}
   */
  async deletePdb(name) {
    await this.init();
    try {
      return await this.delete('poddisruptionbudget', `${name}-pdb`);
    } catch(e) {
      logger.warn('Could not delete PDB, may not exist yet', name, e.message);
    }
  }

  /**
   * @method patchPodResources
   * @description Patch CPU/memory requests on a running pod in-place without restarting it.
   * Requires GKE 1.29+ with InPlacePodVerticalScaling feature gate enabled and
   * resizePolicy: NotRequired set on the target containers.
   *
   * Only patches requests — limits remain sticky and are never changed here.
   *
   * @param {string} podName full pod name (e.g. hostname-0 for a single-replica StatefulSet)
   * @param {Array<{name: string, requests: {cpu: string, memory: string}}>} containers
   * @returns {Promise<string>}
   */
  async patchPodResources(podName, containers) {
    await this.init();
    const patch = JSON.stringify({
      spec: {
        containers: containers.map(c => ({
          name      : c.name,
          resources : { requests: c.requests }
        }))
      }
    });
    return this.exec(
      `kubectl patch pod ${podName} --subresource resize --type merge -p '${patch}'`
    );
  }

  async get(type, name) {
    await this.init();
    let config = await this.exec(`kubectl get ${type} ${name} -o json`);
    return JSON.parse(config);
  }

  /**
   * @method getPodStatus
   * @description Get detailed pod status including current state and recent events
   * 
   * @param {String} podName name of the pod
   * @returns {Promise<Object>} pod status with events
   */
  async getPodStatus(podName) {
    await this.init();
    
    try {
      // Get pod details
      let podDetails = await this.get('pod', podName);
      
      // Get recent events for the pod
      let eventsOutput = await this.exec(`kubectl get events --field-selector involvedObject.name=${podName} --sort-by='.lastTimestamp' -o json`);
      let events = JSON.parse(eventsOutput);
      
      // Extract relevant status information
      let status = {
        name: podName,
        phase: podDetails.status?.phase || 'Unknown',
        conditions: podDetails.status?.conditions || [],
        containerStatuses: podDetails.status?.containerStatuses || [],
        startTime: podDetails.status?.startTime,
        events: events.items?.slice(-10) || [], // Last 10 events
        timestamp: new Date().toISOString()
      };
      
      return status;
    } catch(error) {
      // If pod doesn't exist or other error, return basic error info
      return {
        name: podName,
        phase: 'NotFound',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * @method renderKustomizeTemplate
   * @description Get the kustomize template as a json object.  The template
   * can be in the base or overlay directory.
   * 
   * @param {String} template service template name
   * @param {String} overlay overlay name.  defaults to null which will use the base template.
   * @returns 
   */
  async renderKustomizeTemplate(template, overlay=null) {
    let templatePath;
    if( overlay ) {
      templatePath = path.join(k8sTemplatePath, template, 'overlays', overlay);

      // revert to base template if overlay does not exist
      if( !fs.existsSync(templatePath) ) {
        templatePath = null;
      }
    }

    if( !templatePath ) {
      templatePath = path.join(k8sTemplatePath, template, 'base');
    }

    let yamlStr = await this.exec(`kubectl kustomize ${templatePath}`);
    return yamlStr.split('---\n')
                  .map(t => yaml.load(t));
  }

}

const instance = new KubectlWrapper();
export default instance;