const fs = require('fs-extra');
const path = require('path');
const config = require('../lib/config');
const exec = require('../lib/exec');
const fetch = require('node-fetch');

class Farm {

  constructor() {
    this.startPort = (this.getConfig().options || {}).startPort || 6000;
  }

  /**
   * @method getRootDir
   * @description get the root director for a pg-farm docker-compose cluster
   * 
   * @return {String} directory path
   */
  getRootDir() {
    return path.join(config.rootDir);
  }

  getConfig() {
    let config = JSON.parse(fs.readFileSync(path.join(this.getRootDir(), 'config.json')), 'utf-8');
    if( !config.ports ) config.ports = {};
    if( !config.aws ) config.aws = {};
    return config;
  }

  writeConfig(config) {
    fs.writeFileSync(path.join(this.getRootDir(), 'config.json'), JSON.stringify(config, '  ', '  '));
  }

  allocatePorts(clusterName) {
    let config = this.getConfig();
    if( !config.ports ) config.ports = {};

    // check if this cluster name has already been allocated ports
    let clusters = Object.values(config.ports);
    if( clusters.includes(clusterName) ) {
      let ports = [];
      for( let port in config.ports ) {
        if( config.ports[port] === clusterName ) ports.push(port);
      }
      ports.sort((a,b) => a > b ? 1 : -1);
      return ports;
    }

    let usedPorts = Object.keys(config.ports).map(v => parseInt(v));

    let ports;
    if( !usedPorts.length ) {
      ports = [this.startPort, this.startPort+1, this.startPort+2];
    } else {
      usedPorts.sort((a,b) => a > b ? -1 : 1);
      ports = [usedPorts[0]+1, usedPorts[0]+2, usedPorts[0]+3]
    }

    config.ports[ports[0]] = clusterName;
    config.ports[ports[1]] = clusterName;
    config.ports[ports[2]] = clusterName;

    this.writeConfig(config);

    return ports;
  }

  setAwsKeys(id, secret) {
    let config = this.getConfig();
    config.aws.key_id = id;
    config.aws.key_secret = secret;
    this.writeConfig(config);
  }

  getDomainName() {
    return this.getConfig().domain;
  }


  async listImageVersions(type='snapshot') {
    let response = await fetch('https://registry.hub.docker.com/v1/repositories/ucdlib/pg-farm-snapshot-replicate/tags');
    let data = await response.json();
    return data.map(item => item.name);
  }

}

module.exports = new Farm();