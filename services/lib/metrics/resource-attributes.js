import os from 'os';
// const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const env = process.env;

// https://github.com/open-telemetry/semantic-conventions/blob/main/docs/resource/README.md#semantic-attributes-with-sdk-provided-default-value
function getAttributes() {
  let serviceName = env.SERVICE_NAME || 'unknown';
  let serverUrl = process.env.APP_URL || 'http://localhost:3000';

  return {
    "service.name": serviceName,
    "service.version": env.PG_FARM_VERSION,
    "service.namespace": 'pg-farm-'+new URL(serverUrl).hostname,
    "service.instance.id": serviceName+'-'+os.hostname(),
  }
}

export default getAttributes;