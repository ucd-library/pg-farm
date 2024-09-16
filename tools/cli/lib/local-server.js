
import portfinder from 'portfinder';
import http from 'http';
import path from 'path';
import fs from 'fs';
import open from 'open';
import crypto from 'crypto';
import colors from 'colors';
import { fileURLToPath } from 'url';
import {config, save as saveConfig} from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class LocalLoginServer {

  create(opts) {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this._initServer(opts);
    });
  }

  
  async _initServer(opts) {
    let port = await portfinder.getPortPromise();
    
    let authUrl = `${opts.authUrl}?redirect=${encodeURIComponent(`http://localhost:${port}`)}`;

    this.server = http.createServer(async (req, res) => {

      let jwt = new URL('http://localhost'+req.url)
        .searchParams.get('jwt');

      // if a jwt and username is not provided in request, ignore request
      // otherwise things like a favicon request could mess us up
      if( !jwt ) return;

      config.token = jwt;
      const hash = 'urn:md5:'+crypto.createHash('md5').update(jwt).digest('base64');
      config.tokenHash = hash;

      saveConfig();

      let hostname = new URL(config.host).hostname;

      if( opts.onSuccess ) opts.onSuccess();

      let parts = jwt.split('.');
      let payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      let username = payload.username || payload.preferred_username;


      console.log(`
${colors.green('Logged in successfully!')}
      
You can access token at any time by using 'pgfarm auth token'.  Alternatively, can set
the password to the PGPASSWORD environment variable. For example:

> export PGPASSWORD=$(pgfarm auth token)
> psql -U ${username} -h ${hostname} [database]

For more examples on how to connect run 'pgfarm connect --help'
`);


      await this._respondWithFile(req, res, 200, path.join('..', 'templates', 'loggedin.html'));

      this.resolve();

      await sleep(1000);

      this.server.close();
      process.exit();
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

  _respondWithFile(req, res, statusCode, filename) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(__dirname, filename), 'utf-8', (err, response) => {
        if (err) {
          return reject(err);
        }
        res.writeHead(statusCode, {
          'Content-Length': response.length,
          'Content-Type': 'text/html'
        });
        res.end(response);

        setTimeout(() => {
          req.socket.destroy()
          resolve()
        }, 100);
      });
    });
  };

}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default LocalLoginServer;