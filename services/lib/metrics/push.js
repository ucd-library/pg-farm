import pgClient from '../pg-admin-client.js';
import logger from '../logger.js';

const DEFAULT_INTERVAL_MS = 15000;

/**
 * @function startMetricsPush
 * @description Periodically read every metric currently registered in this process's
 * prom-client registry and upsert its value into the shared pgfarm.metric_snapshot table.
 * This lets administration render a single Prometheus page across all pg-farm processes
 * (gateway, health-probe, etc) without administration needing direct network access to
 * each pod.
 *
 * @param {import('prom-client').Registry} registry prom-client registry to read from
 * @returns {NodeJS.Timeout} interval handle
 */
function startMetricsPush(registry) {
  const intervalMs = parseInt(process.env.METRICS_PUSH_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  return setInterval(async () => {
    try {
      let metrics = await registry.getMetricsAsJSON();

      for( let metric of metrics ) {
        for( let value of metric.values ) {
          let labels = value.labels || {};
          let labelsKey = JSON.stringify(labels, Object.keys(labels).sort());

          await pgClient.upsertMetricSnapshot({
            serviceInstanceId: labels.service_instance_id,
            name: metric.name,
            type: metric.type,
            help: metric.help,
            labelsKey,
            labels,
            value: value.value
          });
        }
      }
    } catch(e) {
      logger.error('Error pushing metrics to pg-admin database', e);
    }
  }, intervalMs);
}

export default startMetricsPush;
