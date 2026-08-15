import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildUsage, parseCatalogBuildArgs } from "./build-options";

const repositoryRoot = "C:/repository";

describe("catalog build CLI options", () => {
  it("uses deterministic synthetic defaults", () => {
    expect(parseCatalogBuildArgs([], repositoryRoot)).toEqual({
      rootDirectory: resolve(repositoryRoot, "packages/test-fixtures"),
      outputFile: resolve(repositoryRoot, "packages/catalog-tooling/dist/catalog-projection.json"),
      production: false,
      catalogVersion: "catalog-local-v1",
      generatedAt: "2026-08-15T00:00:00.000Z",
      reviewedBy: "local-curator",
      releaseNotes: "Synthetic fixture build",
      help: false,
    });
  });

  it("parses production build metadata and review date", () => {
    expect(
      parseCatalogBuildArgs(
        [
          "--root",
          "data/catalog-v1",
          "--output",
          "release/catalog.json",
          "--production",
          "--as-of",
          "2026-08-15",
          "--catalog-version",
          "catalog-v1",
          "--generated-at",
          "2026-08-15T01:02:03.000Z",
          "--reviewed-by",
          "curator@example.invalid",
          "--release-notes",
          "Approved catalog build",
        ],
        repositoryRoot,
      ),
    ).toEqual({
      rootDirectory: resolve(repositoryRoot, "data/catalog-v1"),
      outputFile: resolve(repositoryRoot, "release/catalog.json"),
      production: true,
      asOf: "2026-08-15",
      catalogVersion: "catalog-v1",
      generatedAt: "2026-08-15T01:02:03.000Z",
      reviewedBy: "curator@example.invalid",
      releaseNotes: "Approved catalog build",
      help: false,
    });
  });

  it("rejects invalid dates and timestamps", () => {
    expect(() => parseCatalogBuildArgs(["--as-of", "2026/08/15"], repositoryRoot)).toThrow(
      "--as-of requires a date in YYYY-MM-DD format.",
    );
    expect(() =>
      parseCatalogBuildArgs(["--generated-at", "2026-08-15T00:00:00+09:00"], repositoryRoot),
    ).toThrow("--generated-at requires a UTC timestamp");
  });

  it("documents the build command and safe defaults", () => {
    expect(buildUsage()).toContain("Usage: catalog-tooling build [options]");
    expect(buildUsage()).toContain("packages/catalog-tooling/dist/catalog-projection.json");
  });

  it("accepts the package-manager argument separator", () => {
    expect(parseCatalogBuildArgs(["--", "--help"], repositoryRoot).help).toBe(true);
  });
});
