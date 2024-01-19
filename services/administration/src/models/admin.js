import client from '../../../lib/pg-admin-client.js';
import utils from '../../../lib/utils.js';
import kubectl from '../../../lib/kubectl.js';
import config from '../../../lib/config.js';
import { fileURLToPath } from 'url';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let schemaPath = path.join(__dirname, '..', '..', 'schema');
let k8sTemplatePath = path.join(__dirname, '..', '..', 'k8s');

class AdminModel {

  constructor() {
    this.instancesStarting = {};
  }

  async initSchema() {
    await utils.waitUntil(config.pg.host, config.pg.port);
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

  /**
   * @method getConnection
   * @description Returns a postgres user connection object for a postgres instance
   * 
   * @param {String} instNameOrId PG Farm instance name or ID 
   * @returns 
   */
  async getConnection(instNameOrId) {
    let user = await adminClient.getUser(instNameOrId, 'postgres');

    return {
      id : user.database_id,
      host : user.database_hostname,
      port : user.database_port,
      user : user.username,
      database : user.database_name,
      password : user.password
    };
  }

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
   * @method createInstance
   * @description Creates a new postgres instance
   * 
   * @param {String} name
   * @param {Object} opts
   * 
   * @returns {Promise}
   **/
  async createInstance(name, opts={}) {
    if( !name ) throw new Error('Instance name required');

    let hostname = opts.hostname || 'pg-'+name;
    let description = opts.description || '';
    let port = opts.port || 5432;

    // add instance to database
    let id = await client.createInstance(name, hostname, description, port);

    // create k8s statefulset and service
    // using ensure instance here in case the instance is already running
    // possibly manually created or running docker compose environment
    await this.ensureInstanceRunning(name);

    // wait for instance to be ready
    await utils.waitUntil(hostname, port);

    // create postgres user to database
    await this.addUser(id, 'postgres', 'ADMIN');

    // create admin user to database
    await this.resetPassword(id, 'postgres');

    return id;
  }

  /**
   * @method addUser
   * @description Adds a user to a postgres instance
   * 
   * @param {String} instNameOrId  PG Farm instance name or ID 
   * @param {String} user username 
   * @param {String} type USER, ADMIN, or PUBLIC.  Defaults to USER. 
   * 
   * @returns {Promise}
   */
  async createUser(instNameOrId, user, type='USER') {
    // get instance connection information
    let con = await this.getConnection(instNameOrId);

    // create new random password
    let password = utils.generatePassword();

    // add user to database
    await client.createUser(instNameOrId, user, password, type);

    // make sure pg is running
    await this.ensureInstanceRunning(instNameOrId);

    // add user to postgres
    resp = await pgInstClient.query(
      con, 
      `CREATE USER $1 WITH PASSWORD $2`, 
      [user, password]
    );

    return resp;
  }

  /**
   * @method startInstance
   * @description Starts a postgres instance and service in k8s
   * 
   * @param {String} instNameOrId PG Farm instance name or ID 
   * 
   * @returns {Promise}
   */
  async startInstance(instNameOrId) {
    let instance = await client.getInstance(instNameOrId);
    let hostname = instance.hostname;

    let k8sConfig = this.getTemplate('postgres');
    k8sConfig.metadata.name = hostname;
    
    let spec = k8sConfig.spec;
    spec.selector.matchLabels.app = hostname;
    spec.serviceName = hostname;

    let template = spec.template;
    template.metadata.labels.app = hostname;

    let container = template.spec.containers[0];
    container.image = config.pgInstance.image;
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

  /**
   * @method resetUserPassword
   * @description Resets a user's password to a random password
   * 
   * @param {String} instNameOrId PG Farm instance name or ID
   * @param {String} user 
   * @param {String} password 
   * 
   * @returns {Promise}
   */
  async resetPassword(instNameOrId, user, password) {
    let con = await this.getConnection(instNameOrId);

    // generate random password if not provided
    if( !password ) password = utils.generatePassword();

    // update database
    await client.query(
      `UPDATE ${config.pg.tables.DATABASE_USERS()} 
      SET password = $2 
      WHERE username = $1 AND instance_id = $3`, 
      [user, password, con.id]
    );

    // make sure pg is running
    await this.ensureInstanceRunning(instNameOrId);

    // update postgres instance users password
    let resp = await pgInstClient.query(
      con, 
      `ALTER USER $1 WITH PASSWORD $2`, 
      [user, password]
    );

    return resp;
  }

  /**
   * @method ensureInstanceRunning
   * @description Ensures an instance is running.  If the instance is not running,
   * it will be started.  If the instance is starting, the promise will wait until
   * the instance is running.
   * 
   * @param {String} instNameOrId
   *  
   * @returns {Promise}
   */
  async ensureInstanceRunning(instNameOrId) {
    // get instance information
    let instance = await client.getInstance(instNameOrId);
    let hostname = instance.hostname;
    let port = instance.port;

    // check if already alive
    let isAlive = await utils.isAlive(instance.hostname, instance.port);
    if( isAlive ) return;

    // check if already starting
    if( this.instancesStarting[hostname] ) {
      await utils.waitUntil(hostname, port);
      return;
    }

    // create a promise for other possible callers to wait on
    let state = {};
    state.promise = new Promise((resolve, reject) => {
      state.resolve = resolve;
      state.reject = reject;
    });

    this.instancesStarting[instance.hostname] = state;

    // start instance
    await this.startInstance(instNameOrId);
    
    // wait for instance to be ready
    await utils.waitUntil(hostname, port, 50);

    // resolve promise
    this.instancesStarting[instance.hostname].resolve();
    delete this.instancesStarting[instance.hostname];
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