import os from 'os';
const env = process.env;

/**
 * @function getAttributes
 * @description Build the default Prometheus labels applied to every metric reported by
 * this process. service_instance_id varies per pod/replica, which is what distinguishes
 * rows once they land in the shared pgfarm.metric_snapshot table.
 *
 * @returns {Object}
 */
function getAttributes() {
  let serviceName = env.SERVICE_NAME || 'unknown';
  let serverUrl = process.env.APP_URL || 'http://localhost:3000';

  return {
    service_name: serviceName,
    service_version: env.PG_FARM_VERSION || '',
    service_namespace: 'pg-farm-'+new URL(serverUrl).hostname,
    service_instance_id: serviceName+'-'+os.hostname(),
  }
}

export default getAttributes;
