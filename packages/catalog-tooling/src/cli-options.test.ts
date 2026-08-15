import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseCatalogValidationArgs, usage } from "./cli-options";

const repositoryRoot = resolve("/workspace/repository");

describe("catalog validation CLI options", () => {
  it("defaults to the synthetic fixture without production gates", () => {
    expect(parseCatalogValidationArgs([], repositoryRoot)).toEqual({
      rootDirectory: resolve(repositoryRoot, "packages/test-fixtures"),
      production: false,
      asOf: undefined,
      help: false,
    });
  });

  it("parses an approved Seed validation command", () => {
    expect(
      parseCatalogValidationArgs(
        ["--root", "data/catalog-v1", "--production", "--as-of", "2026-08-15"],
        repositoryRoot,
      ),
    ).toEqual({
      rootDirectory: resolve(repositoryRoot, "data/catalog-v1"),
      production: true,
      asOf: "2026-08-15",
      help: false,
    });
  });

  it("rejects malformed or unknown options", () => {
    expect(() => parseCatalogValidationArgs(["--as-of", "2026/08/15"], repositoryRoot)).toThrow(
      "YYYY-MM-DD",
    );
    expect(() => parseCatalogValidationArgs(["--unknown"], repositoryRoot)).toThrow(
      "Unknown option",
    );
  });

  it("documents the review command", () => {
    expect(usage()).toContain("--production");
    expect(usage()).toContain("--as-of <YYYY-MM-DD>");
  });
});
