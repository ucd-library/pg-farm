import client from '../../../lib/pg-admin-client.js';
import waitUntil from '../../../lib/wait-util.js';
import kubectl from '../../../lib/kubectl.js';
import config from '../../../lib/config.js';
import instanceModel from './instance.js';
import waitUntil from '../../../lib/wait-util.js';
import { fileURLToPath } from 'url';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let schemaPath = path.join(__dirname, '..', '..', 'schema');
let k8sTemplatePath = path.join(__dirname, '..', '..', 'k8s');

class AdminModel {

  constructor() {
    this.PG_IMAGE = 'postgres:14';
    instanceModel.setAdminModel(this);
  }

  async initSchema() {
    await waitUntil(config.pg.host, config.pg.port);
    await client.connect();
  
    // TODO: add migrations
    logger.info('loading sql files from: '+schemaPath)
  
    let files = sortInitScripts(fs.readdirSync(schemaPath));
    for( let file of files ) {
      if( path.parse(file).ext.toLowerCase() !== '.sql' ) continue;
      file = path.join(schemaPath, file);
      logger.info('loading: '+file);
      let response = await client.query(fs.readFileSync(file, 'utf-8'));
      logger.debug(response);
    }
  }

  getTemplate(template) {
    let templatePath = path.join(k8sTemplatePath, template+'.yaml');
    let k8sConfig = yaml.load(fs.readFileSync(templatePath, 'utf-8'));
    return k8sConfig;
  }

  async addInstance(name, opts={}) {
    let hostname = opts.hostname || 'pg-'+name;
    let description = opts.description || '';
    let port = opts.port || 5432;

    let id = await client.addInstance(name, hostname, description, port);

    await this.startInstance(name);

    await waitUntil(hostname, port);

    await this.addUser(id, 'postgres');
    await instanceModel.resetPassword(id, 'postgres');
  }

  async addUser(instNameOrId, username) {
    let password = utils.generatePassword();
    return client.addUser(instNameOrId, username, password);
  }

  async startInstance(name) {
    // check if instance is alive
    

    let instance = await client.getInstance(name);
    let hostname = instance.hostname;

    let k8sConfig = this.getTemplate('postgres');
    k8sConfig.metadata.name = hostname;
    
    let spec = k8sConfig.spec;
    spec.selector.matchLabels.app = hostname;
    spec.serviceName = hostname;

    let template = spec.template;
    template.metadata.labels.app = hostname;

    let container = template.spec.containers[0];
    container.image = this.PG_IMAGE;
    container.name = hostname;
    container.volumeMounts[0].name = hostname+'-ps';

    spec.volumeClaimTemplates[0].metadata.name = hostname+'-ps';

    let pgResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });

    k8sConfig = this.getTemplate('postgres-service');
    k8sConfig.metadata.name = hostname;
    k8sConfig.spec.selector.app = hostname;

    let pgServiceResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });

    return {pgResult, pgServiceResult};
  }

  /**
   * @method removeInstance
   * @description Removes a postgres instance and service.  
   * Note, this does not remove the persistent volume claim.
   * 
   * @param {*} name 
   */
  async removeInstance(name) {
    if( !name.startsWith('pg-') ) name = 'pg-'+name;

    let pgResult = await kubectl.delete('statefulset', name);
    let pgServiceResult = await kubectl.delete('service', name+'-service');

    return {pgResult, pgServiceResult};
  }



}

function sortInitScripts(files) {
  files = files.map(file => {
    let index = 0;
    let name = file;
    if( file.match('-') ) {
      index = parseInt(file.split('-')[0]);
      name = file.split('-')[1];
    } 
    return {file, index, name};
  });

  files.sort((a,b) => {
    if( a.index < b.index ) return -1;
    if( a.index > b.index ) return 1;
    if( a.name < b.name ) return -1;
    if( a.name > b.name ) return 1;
    return 0;
  });

  return files.map(item => item.file);
}


const instance = new AdminModel();
export default instance;