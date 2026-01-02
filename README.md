# Embrace + OpenTelemetry Local Lab (Web → OTLP/HTTP → OTel Collector → Jaeger)

A minimal, reproducible “integration lab” that demonstrates how a web app can export **OpenTelemetry traces + logs (OTLP/HTTP)** to a local **OpenTelemetry Collector**, and visualize traces in **Jaeger** — with a **Solutions Engineer-style “doctor” CLI** that validates common integration pitfalls (CORS, endpoint reachability, config guardrails).

---

## Repository layout

- `app/`  
  Vite + React + TypeScript demo app instrumented with Embrace Web SDK and OTLP exporters.

- `otel/`  
  Local observability stack via Docker Compose:
  - OpenTelemetry Collector (OTLP/HTTP receiver + CORS enabled)
  - Jaeger (trace UI)

- `tools/embrace-doctor/`  
  Node/TypeScript CLI that checks:
  - Collector health
  - OTLP endpoint reachability
  - CORS preflight behavior (required for browser OTLP export)
  - Embrace config guardrail: `ignoreUrls` includes OTLP endpoints to avoid export loops

---

## Tech stack (what each part is used for)

### Demo App (Web)
- **Vite + React + TypeScript**: fast dev server + small code footprint
- **Embrace Web SDK**: browser instrumentation + signal generation
- **OTLP/HTTP exporters**: ship telemetry to Collector locally

### Observability (Local Lab)
- **Docker + Docker Compose**: one-command local stack
- **OpenTelemetry Collector**: receives OTLP/HTTP from the browser, applies CORS, forwards traces
- **Jaeger**: trace UI for verifying end-to-end integration

### Tools
- **Node.js + TypeScript**: `embrace-doctor` CLI for “integration validation”
- **commander + undici + chalk**: CLI args, HTTP requests, readable output

---

## Prerequisites

- Node.js 20+ (Node 22 works)
- Docker + Docker Compose
- macOS/Linux/Windows (WSL works)

---

## Quickstart 

### 1) Install dependencies (run in repo root)

```npm install``

### 2) Start the local observability stack (Collector + Jaeger)
```npm run lab:up```

### 3) Start the demo web app (Vite dev server)
```npm run app:dev```
Open the demo app:

http://localhost:5173

Open Jaeger UI:

http://localhost:16686

### 4) Run integration checks (the “doctor”)
Dev mode (recommended while iterating):
```npm run doctor:dev```

Build + run (recommended before sharing the repo):
```npm run doctor:build```
```npm run doctor```

## Observability stack (what’s running)

When you run npm run lab:up, you start:

###### OpenTelemetry Collector

* OTLP/HTTP receiver: http://localhost:4318

* Health endpoint: http://localhost:13133/

* CORS enabled so browsers can export OTLP/HTTP

###### Jaeger

* UI: http://localhost:16686

* Receives traces forwarded by the Collector

### Demo app behavior (what to click)

Open: http://localhost:5173

You’ll see buttons that generate network activity:

* Success fetch (200): generates a successful request span

* Error fetch (500): generates an error span

* Slow fetch (2s): generates a latency span

Then open: http://localhost:16686

Choose the service (often unknown_service depending on defaults) and click Find Traces.

