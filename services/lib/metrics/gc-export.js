/**
 * Documentation:
 * 
 * https://github.com/GoogleCloudPlatform/opentelemetry-operations-js/blob/main/packages/opentelemetry-cloud-monitoring-exporter/README.md
 * 
 * Authentication.
 * https://github.com/GoogleCloudPlatform/opentelemetry-operations-js?tab=readme-ov-file#opentelemetry-google-cloud-trace-exporter
 * has a note to:
 * https://cloud.google.com/docs/authentication/application-default-credentials
 * We will need to set GOOGLE_APPLICATION_CREDENTIALS to the path of the JSON file that contains your service account key.
 **/

import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { MetricExporter } from "@google-cloud/opentelemetry-cloud-monitoring-exporter";
// import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { GcpDetectorSync } from "@google-cloud/opentelemetry-resource-util";
import resourceAttributes from "./resource-attributes.js";
import fs from 'fs';

const env = process.env;
let serviceAccountFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/etc/google/service-account.json';
let serviceAccountExists = fs.existsSync(serviceAccountFile);
if( serviceAccountExists && !env.GOOGLE_APPLICATION_CREDENTIALS ) {
  env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountFile;
}

function setup() {

  if( !serviceAccountExists ) {
    console.log('Google service account not found, not setting up metrics');
    return;
  }

  console.log('Setting up Google Cloud OpenTelemetry metrics exporter');


  let metricExporter = new MetricExporter({
    keyFile: env.GOOGLE_APPLICATION_CREDENTIALS
  });
  // let traceExporter = new TraceExporter({
  //   keyFile: env.GOOGLE_APPLICATION_CREDENTIALS
  // });

  // Create MeterProvider
  const meterProvider = new MeterProvider({
    // Create a resource. Fill the `service.*` attributes in with real values for your service.
    // GcpDetectorSync will add in resource information about the current environment if you are
    // running on GCP. These resource attributes will be translated to a specific GCP monitored
    // resource if running on GCP. Otherwise, metrics will be sent with monitored resource
    // `generic_task`.
    resource: new Resource(resourceAttributes())
      .merge(new GcpDetectorSync().detect()),
  });

  // Register the exporter
  meterProvider.addMetricReader(
    new PeriodicExportingMetricReader({
      // Export metrics every 10 seconds. 5 seconds is the smallest sample period allowed by
      // Cloud Monitoring.
      exportIntervalMillis: 10000,
      exporter: metricExporter,
    })
  );

  return {
    metricExporter,
    // traceExporter,
    meterProvider
  }

}

export default setup;