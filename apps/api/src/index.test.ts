import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "@route-composer/contracts";

import { handler } from "./index.js";

describe("Lambda entrypoint", () => {
  it("serves the dependency-free health contract", async () => {
    const response = await handler({ rawPath: "/health", routeKey: "GET /health" });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(JSON.parse(response.body))).toMatchObject({ status: "ok" });
  });
});
