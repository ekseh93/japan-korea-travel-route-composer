import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildProjection } from "./projection";
import { SeedValidationError } from "./seed";

const fixtureRoot = resolve(process.cwd(), "../test-fixtures");
const buildOptions = {
  catalogVersion: "catalog-test-v1",
  generatedAt: "2026-08-15T00:00:00.000Z",
  reviewedBy: "test-curator",
  releaseNotes: "Synthetic projection test.",
  production: false,
  asOf: "2026-08-15",
} as const;

describe("catalog projection build", () => {
  it("creates a deterministic projection and checksum", () => {
    const first = buildProjection(fixtureRoot, buildOptions);
    const second = buildProjection(fixtureRoot, buildOptions);

    expect(first).toEqual(second);
    expect(first.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(first.sourceChecksum).toBe(
      "83aa5f0606d27db73240bc8244162d11c40193604de76d50c68b1a5eb250d98b",
    );
    expect(first.projection.metadata.cityStats).toEqual({
      TOKYO: { placeCount: 6, publishedPlaceCount: 6, evidenceCount: 6 },
      SEOUL: { placeCount: 6, publishedPlaceCount: 6, evidenceCount: 6 },
    });
    expect(first.projection.places).toHaveLength(12);
    expect(first.projection.evidence).toHaveLength(12);
    expect(first.projection.routes).toHaveLength(2);
    expect(first.projection).not.toHaveProperty("sources");
  });

  it("keeps synthetic fixtures out of a production projection", () => {
    expect(() => buildProjection(fixtureRoot, { ...buildOptions, production: true })).toThrow(
      SeedValidationError,
    );
  });
});
