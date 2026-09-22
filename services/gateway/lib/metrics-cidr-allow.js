import IPCIDR from 'ip-cidr';
import logger from '../../lib/logger.js';

function cleanList(list) {
  return list.split(/[\s,]+/).map(l => l.trim()).filter(l => l.length > 0);
}

function normalizeIp(ip) {
  if( ip && ip.match(/^::ffff:/) ) {
    return ip.replace(/^::ffff:/, '');
  }
  return ip;
}

const cidrStrings = cleanList(process.env.METRICS_CIDR_ALLOWLIST || '');
const cidrs = cidrStrings.map(cidr => new IPCIDR(cidr));

if( cidrs.length > 0 ) {
  logger.info('Metrics CIDR allowlist active: '+cidrStrings.join(', '));
} else {
  logger.info('Metrics CIDR allowlist not set, ALL requests allowed to /metrics');
}

/**
 * @function isMetricsRequestAllowed
 * @description check whether a request IP is allowed to access /metrics through the
 * gateway. This is opt-in - if METRICS_CIDR_ALLOWLIST is not set, all requests are
 * allowed and /metrics stays open.
 *
 * @param {String} ip request ip address (eg req.ip)
 * @returns {Boolean}
 */
function isMetricsRequestAllowed(ip) {
  if( cidrs.length === 0 ) return true;

  ip = normalizeIp(ip);
  return cidrs.some(cidr => cidr.contains(ip));
}

export {isMetricsRequestAllowed};
