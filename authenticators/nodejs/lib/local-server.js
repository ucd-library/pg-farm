
import portfinder from 'portfinder';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import open from 'open';

const CONFIG_FILE = '.pg-farm.json';

class LocalLoginServer {

  
  async create() {
    let port = await portfinder.getPortPromise();

    this.server = http.createServer(async (req, res) => {


      let jwt = req.get('PG-FARM-AUTHORIZED-TOKEN');

      // if a jwt and username is not provided in request, ignore request
      // otherwise things like a favicon request could mess us up
      if( !jwt  ) return;

      let configFile = path.join(os.homedir(), CONFIG_FILE);
      let config = {};
      if( fs.existsSync(configFile) ) {
        config = JSON.parse(await fs.readFile(configFile, 'utf8'));
      }

      config.jwt = jwt;
      await fs.writeFile(configFile, JSON.stringify(config, null, 2));

      console.log(`Logged in successfully!
      
Auth Token: ${jwt}
   
You can use the above token as the password for your database connection.
---------------------------------
`);


      await this._respondWithFile(req, res, 200, path.join('..', 'templates', 'loggedin.html'));

      this.resolve();

      await sleep(1000);

      this.server.close();
    });

    this.server.listen(port, function() {
      console.log();
      console.log('Visit this URL on any device to log in:');
      console.log(authUrl);
      console.log();
      console.log('Waiting for authentication...');

      open(authUrl);
    });

    this.server.on('error', (e) => {
      console.log('Failed to login :(');
      console.error(e);
      this.server.close();
      this.reject(e);
    });
  }

}

module.exports = LocalLoginServer;