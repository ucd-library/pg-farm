import pgFormat from 'pg-format';
import client from '../lib/pg-admin-client.js';
import kubectl from '../lib/kubectl.js';
import config from '../lib/config.js';
import keycloak from '../lib/keycloak.js';
import pgInstClient from '../lib/pg-instance-client.js';
import logger from '../lib/logger.js';
import modelUtils from './utils.js';

class PgRest {

  async generateConfigFile(dbNameOrId, orgNameOrId=null) {
    let user = await this.models.user.get(dbNameOrId, orgNameOrId, config.pgRest.authenticator.username);
    let database = await this.models.database.get(dbNameOrId, orgNameOrId);
    let keys = JSON.stringify(JSON.stringify(await keycloak.getJWKS()));

    let escapedPass = encodeURIComponent(user.password);
    let escapedUser = encodeURIComponent(user.username);
    let orgUrlName = user.organization_name || '_';

    let conStr = `postgresql://${escapedUser}:${escapedPass}@${user.instance_hostname}:${user.instance_port}/${database.database_name}`;
    let file = `# postgrest.conf
# Generated by pg-farm ${new Date().toISOString()}

db-uri = "${conStr}"

db-schema = "${config.pgRest.schema}"
db-anon-role = "${config.pgInstance.publicRole.username}"

jwt-secret = ${keys}
jwt-role-claim-key = ".preferred_username"

openapi-server-proxy-uri = "${config.appUrl}/api/db/${orgUrlName}/${database.database_name}"

server-port = ${config.pgRest.port}`
    return file;
  }

  /**
   * @method initDb
   * @description Initialize the database for PostgREST roles and schema
   * 
   * @param {String} instNameOrId 
   * @param {String} orgNameOrId
   * 
   * @returns {Promise}
   */
  async initDb(instNameOrId, orgNameOrId=null) {
    let con = await this.models.instance.getConnection(instNameOrId, orgNameOrId);

    // add authenticator user
    logger.info('Ensuring authenticator user: '+config.pgRest.authenticator.username+' on instance: '+instNameOrId+' for organization: '+orgNameOrId)
    await this.models.user.create(instNameOrId, orgNameOrId, config.pgRest.authenticator.username);

    // create the api schema
    logger.info('Ensuring schema: '+config.pgRest.schema+' on instance: '+instNameOrId+', database: '+dbNameOrId+' for organization: '+orgNameOrId)
    await pgInstClient.ensurePgSchema(con, config.pgRest.schema);

    // grant usage on the api schema to the public role
    logger.info('Granting usage on schema: '+config.pgRest.schema+' to public role on instance: '+instNameOrId+', database: '+dbNameOrId+' for organization: '+orgNameOrId)
    let formattedQuery = pgFormat('GRANT USAGE ON SCHEMA %s TO "%s"', 
      config.pgRest.schema, config.pgInstance.publicRole.username
    );
    await pgInstClient.query(con, formattedQuery);

    // grant the public role to the authenticator user
    await this.grantUserAccess(instNameOrId, orgNameOrId, config.pgInstance.publicRole.username, con);
  }

  /**
   * @method grantUserAccess
   * @description Grant pgrest authenticator the role of the given user.  This allows the authenticator
   * to impersonate the user when making requests to the database via a JWT token.
   * 
   * @param {String} instNameOrId instance name or id
   * @param {String} orgNameOrId organization name or id
   * @param {String} username username to grant access
   * @param {Object} con optional.  A postgres connection object
   * 
   * @returns {Promise}
   */
  async grantUserAccess(instNameOrId, orgNameOrId=null, username, con=null) {
    if( username === config.pgInstance.adminRole ) {
      logger.warn('Cannot grant authenticator access to admin role: '+username);
      return;
    }
    
    if( !con ) {
      con = await this.models.instance.getConnection(instNameOrId, orgNameOrId);
    }

    logger.info('Granting role "'+username+'" to authenticator user on instance: '+instNameOrId+' for organization: '+orgNameOrId)
    let formattedQuery = pgFormat('GRANT "%s" TO "%s"', 
      username, config.pgRest.authenticator.username
    );
    await pgInstClient.query(con, formattedQuery);
  }

  async start(dbNameOrId, orgNameOrId=null) {
    if( config.k8s.enabled === false ) {
      logger.warn('K8s is not enabled, just setting state to RUN');
      return;
    }

    let database = await this.models.database.get(dbNameOrId, orgNameOrId);
    let orgName = '';
    if( orgNameOrId ) {
      let org = await client.getOrganization(orgNameOrId);
      orgName = org.name;
    }

    // PostgREST
    let hostname = database.pgrest_hostname;
    let k8sConfig = modelUtils.getTemplate('pgrest');
    k8sConfig.metadata.name = hostname;
    
    let spec = k8sConfig.spec;
    spec.selector.matchLabels.app = hostname;

    let template = spec.template;
    template.metadata.labels.app = hostname;

    let container = template.spec.containers[0];
    container.image = config.pgRest.image;
    container.name = 'pgrest';

    container.env[0].value = database.database_name;
    container.env[1].value = orgName;
    container.env.push({
      name : 'APP_URL',
      value : config.appUrl
    });

    let pgrestResult = await kubectl.apply(k8sConfig, {
      stdin: true,
      isJson: true
    });

    // PostgREST
    k8sConfig = modelUtils.getTemplate('pgrest-service');
    k8sConfig.metadata.name = hostname;
    k8sConfig.spec.selector.app = hostname;

    let pgrestServiceResult = await kubectl.apply(k8sConfig, {
      stdin:true,
      isJson: true
    });

    return {pgrestResult, pgrestServiceResult, hostname};
  }

  async restart(dbNameOrId, orgNameOrId=null) {
    let {hostname} = await this.start(dbNameOrId, orgNameOrId);
    await kubectl.restart('deployment', hostname);
  }

  async stop(dbNameOrId, orgNameOrId=null) {
    let database = await this.models.database.get(dbNameOrId, orgNameOrId);
    let hostname = database.pgrest_hostname;

    logger.info('Stopping PostgREST: '+hostname);

    let pgrestResult, pgrestServiceResult;

    try {
      pgrestResult = await kubectl.delete('deployment', hostname);
    } catch(e) {
      logger.warn('Error deleting statefulset', e.message);
      pgrestResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    try {
      pgrestServiceResult = await kubectl.delete('service', hostname);
    } catch(e) {
      logger.warn('Error deleting service', e.message);
      pgrestServiceResult = {
        message : e.message,
        stack : e.stacks
      }
    }

    return {pgrestResult, pgrestServiceResult};
  }

}

const instance = new PgRest();
export default instance;