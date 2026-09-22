import client from 'prom-client';
import config from '../config.js';
import resourceAttributes from './resource-attributes.js';
import startMetricsPush from './push.js';

const enabled = config.metrics.enabled;
let registry = null;

if( enabled ) {
  console.log('Setting up prom-client metrics registry', resourceAttributes());

  registry = new client.Registry();
  registry.setDefaultLabels(resourceAttributes());
  client.collectDefaultMetrics({register: registry});

  startMetricsPush(registry);
} else {
  console.log('Metrics disabled');
}

/**
 * @description Shared prom-client metrics registry for this process. When metrics are
 * disabled (METRICS_ENABLED !== 'true'), registry is null and callers should no-op before
 * constructing any Counter/Gauge. Counters/Gauges should always be registered with
 * {registers: [metrics.registry]} rather than the prom-client default global registry.
 */
const metrics = {
  get enabled() { return enabled; },
  get registry() { return registry; },
  Counter: client.Counter,
  Gauge: client.Gauge
}

export default metrics;
