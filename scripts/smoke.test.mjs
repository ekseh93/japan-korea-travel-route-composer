/* global Response, fetch */

import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseSmokeArgs, runSmoke } from "./smoke.mjs";

let server;
let baseUrl;

before(async () => {
  server = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<title>한일 여행 동선 조합기</title>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe("smoke command", () => {
  it("parses web and optional API URLs", () => {
    assert.deepEqual(parseSmokeArgs(["--base-url", baseUrl, "--api-base-url", `${baseUrl}/api`]), {
      baseUrl,
      apiBaseUrl: `${baseUrl}/api`,
      retries: 2,
      timeoutMs: 5000,
      expectedMarker: "한일 여행 동선 조합기",
      help: false,
    });
  });

  it("runs health and web marker checks", async () => {
    const result = await runSmoke({ baseUrl, retries: 0, timeoutMs: 1000 });
    assert.deepEqual(
      result.checks.map((check) => check.name),
      ["api-health", "web-marker"],
    );
  });

  it("retries transient server failures", async () => {
    let healthAttempts = 0;
    const fetchImpl = async (url, options) => {
      if (url.endsWith("/health") && healthAttempts++ === 0) {
        return new Response("temporary", { status: 503 });
      }
      return fetch(url, options);
    };
    const result = await runSmoke({ baseUrl, fetchImpl, retries: 1, timeoutMs: 1000 });
    assert.equal(result.checks[0].attempts, 2);
  });

  it("rejects a missing web marker", async () => {
    await assert.rejects(
      runSmoke({ baseUrl, expectedMarker: "not-present", retries: 0, timeoutMs: 1000 }),
      /missing the expected marker/,
    );
  });
});
