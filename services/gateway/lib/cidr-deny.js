import IPCIDR from 'ip-cidr';
import fs from 'fs';

function log(msg, config) {
  if( config.logger ) {
    config.logger.info(msg);
  } else {
    console.log(msg);
  }
}

function reload(config={}) {
  let cidrs = new Set();

  if( config.listFile ) {
    if( fs.existsSync(config.listFile) ) {
      let contents = fs.readFileSync(config.listFile, 'utf8');
      contents = cleanList(contents);
      for( let line of contents ) {
        cidrs.add(line);
      }
    } else {
      log('CIDR Deny list file not found: '+config.listFile, config);
    }
  }

  if( process.env.CIDR_DENY_LIST ) {
    let contents = process.env.CIDR_DENY_LIST;
    contents = cleanList(contents);
    for( let line of contents ) {
      cidrs.add(line);
    }
  }

  config.cidrDeny = Array.from(cidrs).map(cidr => new IPCIDR(cidr));
}

function cleanList(list) {
  return list.split(/(\n|\s|,)/).map(l => l.trim()).filter(l => l.length > 0);
}

const cidrDeny = (config) => {

  if( config.logDeny === undefined ) {
    config.logDeny = process.env.LOG_CIDR_DENY === 'true';
  }

  reload(config);
  if( config.reloadInterval ) {
    setInterval(() => reload(config), config.reloadInterval);
  }

  return async (req, res, next) => {
    if( config.enabled === false ) {
      next();
      return;
    }

    let ip = req.ip || req.connection.remoteAddress;
    if( ip.match(/^::ffff:/) ) {
      ip = ip.replace(/^::ffff:/, '');
    }

    for( let cidr of config.cidrDeny ) {
      if( cidr.contains(ip) ) {
        if( config.logDeny ) {
          log('CIDR Deny: '+ip, config);
        }
        res.status(403).send('Forbidden');
        return;
      }
    }

    next();
  }

};

export default cidrDeny;