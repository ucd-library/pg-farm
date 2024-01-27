import utils from '../../lib/utils.js';
import adminModel from '../../administration/src/models/admin.js';

class InstanceStartup {

  constructor() {
    this.state = {};
  }

  async start(database, instance) {
    if( this.state[database] ) {
      return this.state[database].promise;
    }

    this.state[database] = {};
    this.state[database].promise = new Promise((resolve, reject) => {
      this.state[database].resolve = resolve;
      this.state[database].reject = reject;
    });

    let isPortAlive = await utils.isAlive(
      instance.hostname,
      instance.port
    );

    if (!isPortAlive) {
      logger.info('Port test failed, starting instance', instance.name);
      
      await adminModel.startInstance(instance.name);
      await utils.waitUntil(instance.hostname, instance.port);

      this.resolve(database);

      return true;
    }

    this.resolve(database);
    return false;
  }

  resolve(database) {
    this.state[database].resolve();
    delete this.state[database];
  }
}

const instance = new InstanceStartup();
export default instance;