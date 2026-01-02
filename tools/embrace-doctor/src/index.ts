#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import chalk from "chalk";
import { request } from "undici";
import * as fs from "node:fs";
import path from "node:path"; // OK with NodeNext

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


type CheckResult = { name: string; ok: boolean; details?: string; fix?: string };

const DEFAULTS = {
  collectorHealth: "http://localhost:13133/",
  otlpTraces: "http://localhost:4318/v1/traces",
  otlpLogs: "http://localhost:4318/v1/logs",
  origin: "http://localhost:5173",
  // where we expect the Embrace init config to live
appConfigPath: path.resolve(__dirname, "../../../app/src/embrace.ts"),  
};

async function httpGet(url: string): Promise<{ ok: boolean; status?: number; body?: string; err?: string }> {
  try {
    const res = await request(url, { method: "GET" });
    const body = await res.body.text();
    return { ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body };
  } catch (e: any) {
    return { ok: false, err: e?.message ?? String(e) };
  }
}

async function corsPreflight(url: string, origin: string): Promise<{ ok: boolean; allowOrigin?: string; status?: number; err?: string }> {
  try {
    const res = await request(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    const allowOrigin = res.headers["access-control-allow-origin"] as string | undefined;
    const ok =
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      !!allowOrigin &&
      (allowOrigin === "*" || allowOrigin === origin);

    // consume body to avoid hanging streams
    await res.body.text().catch(() => "");

    return { ok, allowOrigin, status: res.statusCode };
  } catch (e: any) {
    return { ok: false, err: e?.message ?? String(e) };
  }
}

function checkIgnoreUrls(appConfigPath: string, otlpTraces: string, otlpLogs: string): CheckResult {
  try {
    const content = fs.readFileSync(appConfigPath, "utf-8");

    // quick-and-dirty checks (good enough for a 2-day project)
    const hasIgnoreUrls = content.includes("ignoreUrls");
    const hasTraces = content.includes(otlpTraces);
    const hasLogs = content.includes(otlpLogs);

    if (hasIgnoreUrls && hasTraces && hasLogs) {
      return { name: "Embrace config includes ignoreUrls for OTLP endpoints", ok: true };
    }

    return {
      name: "Embrace config includes ignoreUrls for OTLP endpoints",
      ok: false,
      details: `Found ignoreUrls: ${hasIgnoreUrls}, traces URL present: ${hasTraces}, logs URL present: ${hasLogs}`,
      fix:
        `In app/src/embrace.ts ensure:\n` +
        `defaultInstrumentationConfig: { network: { ignoreUrls: ["${otlpTraces}", "${otlpLogs}"] } }`,
    };
  } catch (e: any) {
    return {
      name: "Embrace config includes ignoreUrls for OTLP endpoints",
      ok: false,
      details: `Could not read ${appConfigPath}`,
      fix: `Pass the correct path: --app-config path/to/embrace.ts`,
    };
  }
}

function printResults(results: CheckResult[]) {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    const prefix = r.ok ? chalk.green("✔") : chalk.red("✖");
    console.log(`${prefix} ${r.name}`);
    if (!r.ok && r.details) console.log(chalk.gray(`  Details: ${r.details}`));
    if (!r.ok && r.fix) console.log(chalk.yellow(`  Fix: ${r.fix}`));
  }

  console.log("");
  if (failed.length === 0) {
    console.log(chalk.green("All checks passed. Your local Embrace + OTel lab looks healthy."));
  } else {
    console.log(chalk.red(`${failed.length} check(s) failed.`));
    process.exitCode = 1;
  }
}

const program = new Command();

program
  .name("embrace-doctor")
  .description("Integration checks for Embrace Web SDK -> OTLP/HTTP -> OTel Collector -> Jaeger")
  .option("--collector-health <url>", "Collector health endpoint", DEFAULTS.collectorHealth)
  .option("--otlp-traces <url>", "OTLP traces endpoint", DEFAULTS.otlpTraces)
  .option("--otlp-logs <url>", "OTLP logs endpoint", DEFAULTS.otlpLogs)
  .option("--origin <url>", "Browser origin for CORS preflight", DEFAULTS.origin)
  .option("--app-config <path>", "Path to app/src/embrace.ts", DEFAULTS.appConfigPath);

program
  .command("check")
  .description("Run all checks")
  .action(async () => {
    const opts = program.opts();
    const results: CheckResult[] = [];

    // 1) Collector health
    const health = await httpGet(opts.collectorHealth);
    results.push({
      name: "Collector health endpoint reachable",
      ok: health.ok,
      details: health.ok ? `HTTP ${health.status}` : health.err ?? `HTTP ${health.status}`,
      fix: `Ensure the collector is running: cd otel && docker compose up -d`,
    });

    // 2) CORS preflight traces
    const corsTraces = await corsPreflight(opts.otlpTraces, opts.origin);
    results.push({
      name: "CORS preflight passes for /v1/traces",
      ok: corsTraces.ok,
      details: corsTraces.ok ? `HTTP ${corsTraces.status}, allow-origin=${corsTraces.allowOrigin}` : corsTraces.err ?? `HTTP ${corsTraces.status}, allow-origin=${corsTraces.allowOrigin}`,
      fix:
        `In otel/otel-collector-config.yaml set cors.allowed_origins to include ${opts.origin}\n` +
        `Then restart: cd otel && docker compose restart otel-collector`,
    });

    // 3) CORS preflight logs
    const corsLogs = await corsPreflight(opts.otlpLogs, opts.origin);
    results.push({
      name: "CORS preflight passes for /v1/logs",
      ok: corsLogs.ok,
      details: corsLogs.ok ? `HTTP ${corsLogs.status}, allow-origin=${corsLogs.allowOrigin}` : corsLogs.err ?? `HTTP ${corsLogs.status}, allow-origin=${corsLogs.allowOrigin}`,
      fix:
        `In otel/otel-collector-config.yaml set cors.allowed_origins to include ${opts.origin}\n` +
        `Then restart: cd otel && docker compose restart otel-collector`,
    });

    // 4) ignoreUrls guard
    results.push(checkIgnoreUrls(opts.appConfig, opts.otlpTraces, opts.otlpLogs));

    printResults(results);
  });

program.parse(process.argv);

// default to `check` if no command provided
if (!process.argv.slice(2).length) {
  process.argv.push("check");
  program.parse(process.argv);
}
