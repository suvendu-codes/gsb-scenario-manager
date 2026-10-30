/*
 * OpenTelemetry bootstrap. Load it BEFORE the app so auto-instrumentation can patch
 * http, express, pg and kafkajs:
 *
 *   node --import ./dist/telemetry/otel.js dist/main.js
 *
 * Traces and metrics are exported over OTLP to the in-cluster collector, which forwards
 * them to ClickStack. Everything is configured with standard OTEL_* environment variables:
 *
 *   OTEL_SERVICE_NAME            e.g. scenario-manager-api / scenario-manager-status-worker
 *   OTEL_EXPORTER_OTLP_ENDPOINT  collector address; if unset, the SDK is not started
 *   OTEL_SDK_DISABLED=true       force-disable
 *   OTEL_METRICS_EXPORTER        defaults to otlp here; set to none to turn metrics off
 *   OTEL_METRIC_EXPORT_INTERVAL  ms between metric exports (SDK default 60000)
 *   OTEL_RESOURCE_ATTRIBUTES     e.g. deployment.environment=qa
 *
 * With no endpoint configured (local dev, tests) this file does nothing.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const disabled = process.env.OTEL_SDK_DISABLED === 'true';
const endpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
  process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;

if (!disabled && endpoint) {
  // NodeSDK only creates a metric reader when OTEL_METRICS_EXPORTER is set (traces default to
  // otlp, metrics do not), so without this no metrics would ever be exported.
  process.env.OTEL_METRICS_EXPORTER ??= 'otlp';

  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs spans are very noisy and rarely useful.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    sdk.shutdown().catch(() => undefined);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
