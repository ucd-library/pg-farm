const fs = require('fs-extra');
const path = require('path');
const config = require('../lib/config');

class Farm {

  constructor() {
    this.startPort = 6000;
  }

  /**
   * @method getRootDir
   * @description get the root director for a pg-farm docker-compose cluster
   * 
   * @return {String} directory path
   */
  getRootDir() {
    return path.join(config.rootDir, 'farm');
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

    let usedPorts = Object.keys(config.ports);

    let ports;
    if( !usedPorts.length ) {
      ports = [this.startPort, this.startPort+1];
    } else {
      usedPorts.sort((a,b) => a > b ? -1 : 1);
      ports = [usedPorts[0]+1, usedPorts[0]+1]
    }

    config.ports[ports[0]] = clusterName;
    config.ports[ports[1]] = clusterName;

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

}

module.exports = new Farm();