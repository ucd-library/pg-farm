import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import gcExport from './gc-export.js';
import resourceAttributes from './resource-attributes.js';

const env = process.env;

let meterProvider = null;

function init() {

  if( env.METRICS_ENABLED !== 'true' ) {
    console.log('Metrics disabled');
    return;
  }

  console.log('Setting up node OpenTelemetry metrics', resourceAttributes());


  // setup standard set of instrumentations

  // setup GC reporting and metering
  var traceExporter, metricExporter;
  if( env.METRICS_EXPORT_GC === 'true' ) {
    let exporters = gcExport();
    if( exporters ) {
      // traceExporter = exporters.traceExporter;
      metricExporter = exporters.metricExporter;
      meterProvider = exporters.meterProvider;
    }
  
  // This option is mostly for debugging the telemetry
  } 
  // else if( env.FIN_METRICS_EXPORT_STDOUT === 'true' ) {
  //   traceExporter = new ConsoleSpanExporter();
  //   metricExporter = new ConsoleMetricExporter();
  //   meterProvider = new MeterProvider({
  //     resource: new Resource(resourceAttributes())
  //   });
  // }

  if( !metricExporter ) {
    return;
  }

  let serviceName = env.SERVICE_NAME || 'pg-farm';


  const sdk = new NodeSDK({
    metricReader: new PeriodicExportingMetricReader({
      exportIntervalMillis: 15000,
      exporter: metricExporter,
    }),

    instrumentations : [],
    resource: new Resource(resourceAttributes()),
    serviceName : serviceName
  });
  
  sdk.start();

}

init();

const metrics = {
  get meterProvider() { return meterProvider; }
}
export default metrics;