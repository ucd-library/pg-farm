const fs = requires('fs-extra');
const path = require('path');

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
    return JSON.parse(fs.readFileSync(this.getRootDir(), 'config.json'));
  }

  allocatePorts() {

  }

  addCluster(clusterName, pgPort, pgrPort) {

  }

  removeCluster(clusterName) {

  }

  getDomainName() {
    return this.getConfig().domain;
  }

}