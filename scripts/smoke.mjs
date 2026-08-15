/* global AbortController, URL, clearTimeout, console, fetch, process, setTimeout */

import { pathToFileURL } from "node:url";

const defaultMarker = "한일 여행 동선 조합기";

export class SmokeError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "SmokeError";
    this.details = details;
  }
}

function valueAfter(argv, index, option) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new SmokeError(`${option} requires a value.`);
  }
  return value;
}

function positiveInteger(value, option) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new SmokeError(`${option} requires a non-negative integer.`);
  }
  return parsed;
}

function normalizeUrl(value, option) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new SmokeError(`${option} requires an absolute HTTP(S) URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SmokeError(`${option} requires an absolute HTTP(S) URL.`);
  }
  return url.toString().replace(/\/$/, "");
}

export function parseSmokeArgs(argv) {
  let baseUrl;
  let apiBaseUrl;
  let retries = 2;
  let timeoutMs = 5000;
  let expectedMarker = defaultMarker;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--help" || argument === "-h") {
      help = true;
    } else if (argument === "--base-url") {
      baseUrl = valueAfter(argv, index, argument);
      index += 1;
    } else if (argument === "--api-base-url") {
      apiBaseUrl = valueAfter(argv, index, argument);
      index += 1;
    } else if (argument === "--retries") {
      retries = positiveInteger(valueAfter(argv, index, argument), argument);
      index += 1;
    } else if (argument === "--timeout-ms") {
      timeoutMs = positiveInteger(valueAfter(argv, index, argument), argument);
      if (timeoutMs === 0) throw new SmokeError("--timeout-ms requires a positive integer.");
      index += 1;
    } else if (argument === "--expected-marker") {
      expectedMarker = valueAfter(argv, index, argument);
      index += 1;
    } else {
      throw new SmokeError(`Unknown option: ${argument}`);
    }
  }

  if (help) return { help: true };
  if (baseUrl === undefined) throw new SmokeError("--base-url is required.");
  return {
    baseUrl: normalizeUrl(baseUrl, "--base-url"),
    apiBaseUrl: normalizeUrl(apiBaseUrl ?? baseUrl, "--api-base-url"),
    retries,
    timeoutMs,
    expectedMarker,
    help: false,
  };
}

export function smokeUsage() {
  return [
    "Usage: smoke --base-url <url> [options]",
    "",
    "Checks:",
    '  API <api-base-url>/health returns HTTP 2xx and { status: "ok" }',
    "  Web <base-url>/ returns HTTP 2xx and contains the expected marker",
    "",
    "Options:",
    "  --base-url <url>          Web base URL (required)",
    "  --api-base-url <url>      API base URL (default: --base-url)",
    "  --retries <n>             Retry transient failures (default: 2)",
    "  --timeout-ms <n>          Per-request timeout (default: 5000)",
    `  --expected-marker <text>  Web marker (default: ${defaultMarker})`,
    "  --help                    Show this help",
  ].join("\n");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request(url, options) {
  let lastError;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await options.fetchImpl(url, { signal: controller.signal });
      const body = await response.text();
      if (response.ok) return { response, body, attempts: attempt + 1 };
      lastError = new SmokeError(`Smoke request failed with HTTP ${response.status}: ${url}`, {
        status: response.status,
        body,
        attempts: attempt + 1,
      });
      if (response.status < 500) throw lastError;
    } catch (error) {
      if (
        error instanceof SmokeError &&
        error.details.status !== undefined &&
        error.details.status < 500
      ) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < options.retries) await sleep(100 * 2 ** attempt);
  }
  throw new SmokeError(`Smoke request could not complete: ${url}`, {
    cause: lastError?.message,
    attempts: options.retries + 1,
  });
}

export async function runSmoke({
  baseUrl,
  apiBaseUrl = baseUrl,
  retries = 2,
  timeoutMs = 5000,
  expectedMarker = defaultMarker,
  fetchImpl = fetch,
}) {
  const health = await request(`${apiBaseUrl}/health`, { fetchImpl, retries, timeoutMs });
  let healthBody;
  try {
    healthBody = JSON.parse(health.body);
  } catch {
    throw new SmokeError("Health response is not valid JSON.", { body: health.body });
  }
  if (healthBody.status !== "ok") {
    throw new SmokeError("Health response did not report status=ok.", { body: healthBody });
  }

  const web = await request(`${baseUrl}/`, { fetchImpl, retries, timeoutMs });
  if (!web.body.includes(expectedMarker)) {
    throw new SmokeError("Web response is missing the expected marker.", {
      expectedMarker,
    });
  }

  return {
    checks: [
      { name: "api-health", url: `${apiBaseUrl}/health`, attempts: health.attempts },
      { name: "web-marker", url: `${baseUrl}/`, attempts: web.attempts },
    ],
  };
}

async function main() {
  const options = parseSmokeArgs(process.argv.slice(2));
  if (options.help) {
    console.log(smokeUsage());
    return;
  }
  const result = await runSmoke(options);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
