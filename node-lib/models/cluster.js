const fs = require('fs-extra');
const path = require('path'); 
const config = require('../lib/config');
const exec = require('../lib/exec');
const farm = require('./farm');
const ssl = require('../lib/ssl');
const fetch = require('node-fetch');

const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');
const DC_TEMPLATES_DIR = path.resolve(TEMPLATES_DIR, 'docker-compose');
const APACHE_TEMPLATES_DIR = path.resolve(TEMPLATES_DIR, 'apache');

class Cluster {

  /**
   * @method getRootDir
   * @description get the root director for a pg-farm docker-compose cluster
   * 
   * @param {String} clusterName Optional
   * 
   * @return {String} directory path
   */
  getRootDir(clusterName) {
    if( clusterName ) {
      return path.join(config.rootDir, clusterName);
    }
    return config.rootDir;
  }

  /**
   * @method list
   * @description list all pg-farm docker-compose clusters
   * 
   * @returns {Array}
   */
  list() {
    return fs.readdirSync(this.getRootDir())
      .filter(file => fs.lstatSync(path.join(this.getRootDir(),file)).isDirectory());
  }

  /**
   * @method exits
   * @description does a pg-farm docker-compose cluster exist?
   * 
   * @returns {Boolean}
   */
  exists(clusterName) {
    return this.list().includes(clusterName);
  }

  /**
   * @method getDockerComposeCmd
   * @description return the docker-compose base command for pg-farm docker-compose cluster
   * 
   * @param {String} clusterName 
   * 
   * @returns {String}
   */
  getDockerComposeCmd(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }
    // HACK. Below isn't working as of docker-compose version 1.25.4, build 8d51620a
    // return `docker-compose --project-directory ${this.getRootDir()}/${clusterName}`;
    return `docker-compose --env-file ${this.getRootDir()}/${clusterName}/.env --file ${this.getRootDir()}/${clusterName}/docker-compose.yml`;
  }

  /**
   * @method create
   * @description create a pg-farm docker-compose cluster
   * 
   * @param {Object} args
   * @param {String} args.name
   * 
   * @returns {Object}
   */
  async create(args) {
    let name = args.name.trim().toLowerCase().replace(/( |-)/g, '-');
    if( this.exists(name) ) {
      throw new Error('Cluster already exists: '+name);
    }
    if( !['snapshot', 'streaming'].includes(args.type) ) {
      throw new Error('Unknown cluster type: '+args.type);
    }
    if( !['9.6', '10', '11', '12'].includes(args.version) ) {
      throw new Error('Unsupported PostgreSQL version: '+args.version);
    }

    let rootDir = this.getRootDir(name);
    await fs.mkdirp(rootDir);

    let farmConfig = farm.getConfig();

    // set the certs
    let certType = '';
    if( args.serverCrt && args.serverKey ) {
      await fs.copy(path.join(args.serverCrt), path.join(rootDir, 'server.crt'));
      await fs.copy(path.join(args.serverKey), path.join(rootDir, 'server.key'));
      certType = 'server';

    // Check for farm default certs
    } else if ( farmConfig.certs && farmConfig.certs.crt && farmConfig.certs.key ) {
      
      await fs.copy(path.join(farmConfig.certs.crt), path.join(rootDir, 'server.crt'));
      await fs.chmod(path.join(rootDir, 'server.crt'), 0o400);
      await fs.copy(path.join(farmConfig.certs.key), path.join(rootDir, 'server.key'));
      await fs.chmod(path.join(rootDir, 'server.key'), 0o400);
      certType = 'server';

    } else {
      try {
        await ssl.generateSelfSignedCert(rootDir);
        certType = 'self-signed';
      } catch(e) {
        certType = 'self-signed-failed';
      }
    }

    await fs.copy(
      path.join(DC_TEMPLATES_DIR, args.type+'-replicate', 'docker-compose.yml'),
      path.join(rootDir, 'docker-compose.yml')
    );

    this.setClusterAwsKeys(name, farmConfig.aws.key_id, farmConfig.aws.key_secret);

    let ports = farm.allocatePorts(name);
    let farmVersion = (await farm.listImageVersions())[0];

    let env = {
      CLUSTER_NAME : name,
      PG_VERSION : args.version,
      PG_FARM_VERSION : farmVersion,
      COMPOSE_PROJECT_NAME : 'pg-farm-'+name,
      AWS_BUCKET : farmConfig.aws.bucket || 'pg-farm',
      PG_FARM_REPL_PORT : ports[0],
      PG_FARM_PGR_PORT : ports[1],
      PG_FARM_CONTROLLER_PORT : ports[2],
      PGR_SCHEMA : args.pgrSchema || 'public',
      PGR_DATABASE : args.pgrDatabase || 'postgres',
      PGR_USER : args.pgrUser || 'library_user',
      PGR_PASSWORD : args.pgrPassword || 'library_user',
      PGR_ANON_ROLE : 'library_user',
      PGR_URL : `https://${name}.${farmConfig.domain}`,
      SSL_CERT_TYPE : certType
    };
    env.PGR_USER_PASSWORD = env.PGR_USER + (env.PGR_PASSWORD ? ':'+env.PGR_PASSWORD : '');

    this.setEnv(name, env);

    return env;
  }

  /**
   * @method up
   * @description bring a pg-farm docker-compose cluster up.  
   * runs `docker-compose up -d` for cluster
   * 
   * @param {String} clusterName
   * 
   * @returns {Promise} resolves to {stdout, stderr} object 
   */
  up(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }

    return exec(this.getDockerComposeCmd(clusterName)+' up -d');
  }

  /**
   * @method down
   * @description bring a pg-farm docker-compose cluster down.  
   * runs `docker-compose down` for cluster
   * 
   * @param {String} clusterName
   * 
   * @returns {Promise} resolves to {stdout, stderr} object 
   */
  down(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }

    return exec(this.getDockerComposeCmd(clusterName)+' down');
  }

  /**
   * @method ps
   * @description return the process status for a cluster
   * 
   * @param {String} clusterName
   * 
   * @returns {Promise} resolves to ${String} stdout 
   */
  async ps(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }

    let {stdout} = await exec(this.getDockerComposeCmd(clusterName)+' ps');
    return stdout;
  }

  /**
   * @method restore
   * @description restore a cluster from a S3 backup.
   * 
   * @param {String} clusterName
   * 
   */
  restore(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }

    return exec(this.getDockerComposeCmd(clusterName)+' exec -T controller bash -c "/scripts/restore.sh; exit 0"');
  }

  /**
   * @method getEnvFile
   * @description returns the file path for a pg-farm docker-compose cluster
   * .env file
   * 
   * @param {String} clusterName
   * 
   * @return {String} file path 
   */
  getEnvFile(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }
    return `${this.getRootDir()}/${clusterName}/.env`;
  }

  /**
   * @method getEnv
   * @description get cluster env information
   * 
   * @param {String} clusterName Optional.  If not provided returns all cluster env file information
   * Otherwise return env file information for specific cluster as Object.
   * 
   * @returns {Object|Array}
   */
  getEnv(clusterName) {
    if( !clusterName ) {
      return this.list().map(cluster => ({
        cluster,
        env : this.getEnv(cluster)
      }));
    }

    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }

    let env = {};
    if( fs.existsSync(this.getEnvFile(clusterName)) ) {
      fs.readFileSync(this.getEnvFile(clusterName), 'utf-8')
        .split('\n')
        .map(line => line.replace(/#.*/, '').split('='))
        .filter(line => line.length >= 2)
        .forEach(line => {
          env[line.shift()] = line.join('=')
                                  .trim()
                                  .replace(/^"/, '')
                                  .replace(/"$/, '')
        });
    }

    return env;
  }

  /**
   * @method setEnv
   * @description set the .env file contents for a pg-farm docker-compose cluster
   * 
   * @param {String} clusterName name of cluster
   * @param {Object} params key/value pairs to set in .env file
   * @param {Boolean} partial Defaults to false.  Is this a partial update or complete replacement? 
   * 
   * @returns {Object} new env object
   */
  setEnv(clusterName, params, partial=false) {
    if( partial ) {
      let env = this.getEnv(clusterName);
      params = Object.assign(env, params);
    }

    let content = '';
    for( let key in params ) {
      content += key+'='+params[key]+'\n';
    }

    fs.writeFileSync(this.getEnvFile(clusterName), content);

    return this.getEnv(clusterName);
  }

  /**
   * @method getPort
   * @description returns the bound port for a pg-farm docker-compose cluster.
   * By default is returns the postgres port unless the pgr parameter is set to
   * true, then the pgr port is returned.
   * 
   * @param {String} clusterName 
   * @param {Boolean} pgr 
   * 
   * @returns {Number}
   */
  getPort(clusterName, pgr=false) {
    let env = this.getEnv(clusterName);
    if( pgr ) return parseInt(env['PG_FARM_PGR_PORT']);
    return parseInt(env['PG_FARM_REPL_PORT']);
  }

  /**
   * @method upgradeImage
   * @description upgrade pg-farm image versions.  Defaults to latest
   * 
   * @param {String} clusterName 
   * @param {String} version Optional. image version, defaults to latest
   */
  async upgradeImage(clusterName, version) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }
    let versions = await farm.listImageVersions();

    if( typeof version !== 'string') version = '';
    if( !version ) version = versions[0];

    
    if( !versions.includes(version) ) {
      throw new Error('Unknown pg-farm image version: '+version);
    }

    this.setEnv(clusterName, {'PG_FARM_VERSION': version}, true);

    return version
  }

  /**
   * @method setAwsKeys
   * @description helper function to set the aws cli key id and secret.
   * It's a good idea to keep these rotated.  This function rotates keys
   * for all pg-farm clusters
   * 
   * @param {String} id aws access key id 
   * @param {String} secret aws secret access key
   * @param {String} clusterName Optional.  Only set keys for this cluster.  Used by create()
   * 
   */
  setAwsKeys(id, secret) {
    if( !id || !secret ) throw new Error('AWS access id and secret required');

    farm.setAwsKeys(id, secret);
    this.list()
      .forEach(cluster => this.setClusterAwsKeys(cluster, id, secret));
  }

  /**
   * @method setClusterAwsKeys
   * @description set the aws keys for a cluster
   * 
   * @param {String} clusterName docker-compose cluster name to set keys for
   * @param {String} id aws access key id 
   * @param {String} secret aws secret access key
   */
  setClusterAwsKeys(clusterName, id, secret) {
    let file = `${this.getRootDir(clusterName)}/.aws-credentials`;
    fs.writeFileSync(file, `[default]
aws_access_key_id=${id}
aws_secret_access_key=${secret}`)
  }

  /**
   * @method destroy
   * @description completely remove a pg-farm docker-compose cluster.  will run:
   * docker-compose down -v
   * rm -r cluster-dir 
   * 
   * @param {String} clusterName
   * 
   * @returns {Promise} 
   */
  async destroy(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }

    // kill all docker bits
    try {
      await exec(this.getDockerComposeCmd(clusterName)+' down -v');
    } catch(e) {}

    // remove all files
    try {
      await exec(`rm -rf ${this.getRootDir(clusterName)}`);
    } catch(e) {}
  }

}

module.exports = new Cluster();