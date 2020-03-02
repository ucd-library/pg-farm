const fs = require('fs-extra');
const path = require('path'); 
const config = require('../lib/config');
const exec = require('../lib/exec');
const farm = require('./farm');
const ssl = require('../lib/ssl');

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
      .filter(file => file !== 'config.json');
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


    let rootDir = path.join(this.getRootDir(), name);
    await fs.mkdirp(rootDir);

    // set the certs
    let certType = '';
    if( args.serverCrt && args.serverKey ) {
      await fs.copy(path.join(args.serverCrt), path.join(rootDir, 'server.crt'));
      await fs.copy(path.join(args.serverKey), path.join(rootDir, 'server.key'));
      certType = 'server';
    } else {
      await ssl.generateSelfSignedCert(rootDir);
      certType = 'self-signed';
    }

    await fs.copy(
      path.join(DC_TEMPLATES_DIR, args.type+'-replicate', 'docker-compose.yml'),
      path.join(rootDir, 'docker-compose.yml')
    );

    let farmConfig = farm.getConfig();
    this.setClusterAwsKeys(name, farmConfig.aws.key_id, farmConfig.aws.key_secret);

    let ports = farm.allocatePorts(name);

    let env = {
      CLUSTER_NAME : name,
      COMPOSE_PROJECT_NAME : 'pg-farm-'+name,
      AWS_BUCKET : farmConfig.aws.bucket || 'pg-farm',
      PG_FARM_REPL_PORT : ports[0],
      PG_FARM_PGR_PORT : ports[1],
      PGR_SCHEMA : args.pgrSchema || 'public',
      PGR_DATABASE : args.pgrDatabase || 'postgres',
      PGR_USER : args.pgrUser || 'library_user',
      PGR_PASSWORD : args.pgrPassword || 'library_user',
      PGR_ANON_ROLE : 'library_user',
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

  restore(clusterName) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }

    return exec(this.getDockerComposeCmd(clusterName)+' exec -T pg-repl bash -c "/scripts/restore.sh; exit 0"');
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

  async upgradeImage(clusterName, version) {
    if( !this.exists(clusterName) ) {
      throw new Error('Unknown cluster: '+clusterName);
    }
    if( typeof version !== 'string') version = '';
    if( !version ) throw new Error('Version number required');

    let versions = await farm.listImageVersions();
    if( !versions.includes(version) ) {
      throw new Error('Unknown pg-farm image version: '+version);
    }

    let dcFilePath = path.join(this.getRootDir(clusterName), 'docker-compose.yml');
    let currentVersion = await this.listImageVersion(clusterName);

    let contents = fs.readFileSync(dcFilePath, 'utf-8');
    contents = contents.replace(new RegExp('-replicate:'+currentVersion), '-replicate:'+version);
    fs.writeFileSync(dcFilePath, contents);

    return {
      dockerCompose : contents,
      oldVersion : currentVersion,
      newVersion : version
    }
  }

  async listImageVersion(clusterName) {
    let dc = this.getDockerComposeCmd(clusterName)+' images pg-repl';
    let {stdout, stderr} = await exec(dc);

    return stdout.split('\n')
      .filter(row => row !== '')
      .map(row => row.replace(/ +/, ' '))
      .pop()
      .split(' ')
      .filter(row => row !== '')[2]
      .trim();
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
      .forEach(cluster => this.setClusterAwsKeys(id, secret, cluster));
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