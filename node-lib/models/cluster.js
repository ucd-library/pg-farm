const fs = require('fs-extra');
const path = require('path'); 
const config = require('../lib/config');

class Cluster {

  dockerCompose(args) {

  }

  async create(args) {
    let c = config();
    
    let rootDir = path.join(c.rootDir, args.name);
    if( fs.existsSync(rootDir) ) {
      throw new Error('Cluster already exists: '+args.name);
    }

    await fs.mkdirp(rootDir);

    

  }

}