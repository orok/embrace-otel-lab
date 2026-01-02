import { initSDK } from "@embrace-io/web-sdk";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

/**
 * Local lab endpoints (OTel Collector)
 */
const OTLP_TRACES_URL = "http://localhost:4318/v1/traces";
const OTLP_LOGS_URL = "http://localhost:4318/v1/logs";

/**
 * IMPORTANT:
 * - appID can be any non-empty string for local lab purposes.
 * - appVersion should be something stable so traces group consistently.
 */
export function startEmbrace() {
  initSDK({
    appID: "local-lab",
    appVersion: "0.1.0",

    // Send spans + logs to the local Collector
    spanExporters: [new OTLPTraceExporter({ url: OTLP_TRACES_URL })],
    logExporters: [new OTLPLogExporter({ url: OTLP_LOGS_URL })],

    /**
     * Critical guard:
     * The exporter itself makes HTTP requests. If network instrumentation
     * captures those exporter requests, you can create an export loop.
     * So we ignore the OTLP endpoints.
     */
    defaultInstrumentationConfig: {
      network: {
        ignoreUrls: [OTLP_TRACES_URL, OTLP_LOGS_URL],
      },
    },
  });
}
