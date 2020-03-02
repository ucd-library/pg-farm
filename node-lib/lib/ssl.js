const exec = require('./exec')

class SSL {

  async generateSelfSignedCert(directory) {
    let opts = {cwd: directory};
  
    var {stdout, stderr} = await exec(`openssl req -nodes -newkey rsa:2048 -keyout server.key -out server.csr -subj "/C=US/ST=California/L=California/O=UC Davis Library/OU=IT Department/CN=pg-farm.org"`, opts); 
    var {stdout, stderr} = await exec(`openssl req -x509 -in server.csr -text -key server.key -out server.crt`, opts);
    await exec('rm server.csr', opts);
    await exec('chmod og-rwx server.key', opts);
  }

}

module.exports = new SSL();