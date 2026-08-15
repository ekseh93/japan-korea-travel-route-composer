import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildProjection, writeProjectionArtifact } from "./projection";
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
    expect(first.projection.places[0]).toMatchObject({
      published: true,
      openingStatus: "OPEN_SPACE",
      evidence: [{ tier: "A_OFFICIAL_OPEN", active: true }],
    });
    expect(first.projection.places[0]).not.toHaveProperty("publicationStatus");
    expect(first.projection.places[0]).not.toHaveProperty("evidenceRefs");
    expect(first.projection.evidence[0]).toMatchObject({
      providerName: "Synthetic Fixture Provider",
      attribution: "Synthetic Fixture Provider; tests only",
      url: "https://example.com/tokyo/asakusa-landmark",
    });
    expect(first.projection.evidence[0]).not.toHaveProperty("sourceId");
    expect(first.projection.evidence[0]).not.toHaveProperty("rightsBasis");
    expect(first.projection.evidence[0]).not.toHaveProperty("editorialSummary");
  });

  it("keeps synthetic fixtures out of a production projection", () => {
    expect(() => buildProjection(fixtureRoot, { ...buildOptions, production: true })).toThrow(
      SeedValidationError,
    );
  });

  it("writes an artifact without Source internals", () => {
    const directory = mkdtempSync(join(tmpdir(), "catalog-projection-"));
    const outputFile = join(directory, "nested", "catalog.json");

    try {
      const result = buildProjection(fixtureRoot, buildOptions);
      writeProjectionArtifact(outputFile, result);
      const artifact = JSON.parse(readFileSync(outputFile, "utf8")) as Record<string, unknown>;

      expect(artifact).toMatchObject({
        checksum: result.checksum,
        sourceChecksum: result.sourceChecksum,
      });
      expect(artifact).not.toHaveProperty("canonicalJson");
      expect(artifact.projection).not.toHaveProperty("sources");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
