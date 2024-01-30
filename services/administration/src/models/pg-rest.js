import client from '../../../lib/pg-admin-client.js';
import config from '../../../lib/config.js';
import keycloak from '../../../lib/keycloak.js';

class PgRest {



  async generateConfigFile(instNameOrId) {
    let user = await client.getUser(instNameOrId, config.pgRest.authenticator.username);
    let keys = JSON.stringify(JSON.stringify(await keycloak.getJWKS()));

    let escapedPass = encodeURIComponent(user.password);
    let escapedUser = encodeURIComponent(user.username);

    let conStr = `postgresql://${escapedUser}:${escapedPass}@${user.database_hostname}:${user.database_port}/${user.database_name}`;
    let file = `# postgrest.conf
# Generated by pg-farm ${new Date().toISOString()}

db-uri = "${conStr}"

db-schema = "${config.pgRest.schema}"
db-anon-role = "${config.pgInstance.publicRole.username}"

jwt-secret = ${keys}
jwt-role-claim-key = ".preferred_username"

server-port = ${config.pgRest.port}`
    return file;
  }

}

const instance = new PgRest();
export default instance;