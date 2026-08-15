import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { SeedValidationError, validateSeedDirectory } from "./seed";

const fixtureRoot = resolve(process.cwd(), "../test-fixtures");

describe("seed schema and rights gate", () => {
  it("validates the complete synthetic fixture set", () => {
    const report = validateSeedDirectory(fixtureRoot, { production: false });
    expect(report.sourceCount).toBe(1);
    expect(report.evidenceCount).toBe(12);
    expect(report.placeCount).toBe(12);
    expect(report.routeCount).toBe(24);
    expect(report.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects the same synthetic set in production mode", () => {
    expect(() => validateSeedDirectory(fixtureRoot, { production: true })).toThrow(
      SeedValidationError,
    );
    try {
      validateSeedDirectory(fixtureRoot, { production: true });
    } catch (error) {
      expect(error).toBeInstanceOf(SeedValidationError);
      expect(
        (error as SeedValidationError).issues.some(
          (issue) => issue.code === "FIXTURE_IN_PRODUCTION",
        ),
      ).toBe(true);
    }
  });

  it.each([
    ["BLOCKED", "BLOCKED_SOURCE_REFERENCE"],
    ["UNVERIFIED", "BLOCKED_SOURCE_REFERENCE"],
  ] as const)("rejects a %s Source reference", (reviewStatus, expectedCode) => {
    const root = mkdtempSync(join(tmpdir(), "route-composer-source-gate-"));
    try {
      cpSync(fixtureRoot, root, { recursive: true });
      const sourceFile = join(root, "sources", "synthetic_source.json");
      const source = JSON.parse(readFileSync(sourceFile, "utf8")) as Record<string, unknown>;
      source.reviewStatus = reviewStatus;
      writeFileSync(sourceFile, `${JSON.stringify(source, null, 2)}\n`);

      expect(() => validateSeedDirectory(root, { production: false, asOf: "2026-08-15" })).toThrow(
        SeedValidationError,
      );
      try {
        validateSeedDirectory(root, { production: false, asOf: "2026-08-15" });
      } catch (error) {
        expect(
          (error as SeedValidationError).issues.some((issue) => issue.code === expectedCode),
        ).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects approved evidence after its review due date", () => {
    const root = mkdtempSync(join(tmpdir(), "route-composer-expiry-gate-"));
    try {
      cpSync(fixtureRoot, root, { recursive: true });
      const evidenceFile = join(root, "evidence", "tokyo", "ev_tokyo_ueno_museum_name.json");
      const evidence = JSON.parse(readFileSync(evidenceFile, "utf8")) as Record<string, unknown>;
      evidence.reviewDueAt = "2026-08-14";
      writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);

      expect(() => validateSeedDirectory(root, { production: false, asOf: "2026-08-15" })).toThrow(
        SeedValidationError,
      );
      try {
        validateSeedDirectory(root, { production: false, asOf: "2026-08-15" });
      } catch (error) {
        expect(
          (error as SeedValidationError).issues.some(
            (issue) => issue.code === "EVIDENCE_REVIEW_EXPIRED",
          ),
        ).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects official evidence from a manual-link-only Source", () => {
    const root = mkdtempSync(join(tmpdir(), "route-composer-manual-link-gate-"));
    try {
      cpSync(fixtureRoot, root, { recursive: true });
      const sourceFile = join(root, "sources", "synthetic_source.json");
      const source = JSON.parse(readFileSync(sourceFile, "utf8")) as Record<string, unknown>;
      source.reviewStatus = "MANUAL_LINK_ONLY";
      writeFileSync(sourceFile, `${JSON.stringify(source, null, 2)}\n`);

      expect(() => validateSeedDirectory(root, { production: false, asOf: "2026-08-15" })).toThrow(
        SeedValidationError,
      );
      try {
        validateSeedDirectory(root, { production: false, asOf: "2026-08-15" });
      } catch (error) {
        expect(
          (error as SeedValidationError).issues.some(
            (issue) => issue.code === "MANUAL_LINK_PUBLICATION_INVALID",
          ),
        ).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects an evidence URL outside the registered Source host", () => {
    const root = mkdtempSync(join(tmpdir(), "route-composer-host-gate-"));
    try {
      cpSync(fixtureRoot, root, { recursive: true });
      const evidenceFile = join(root, "evidence", "tokyo", "ev_tokyo_ueno_museum_name.json");
      const evidence = JSON.parse(readFileSync(evidenceFile, "utf8")) as Record<string, unknown>;
      evidence.sourceUrl = "https://unregistered.example/place";
      writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);

      expect(() => validateSeedDirectory(root, { production: false, asOf: "2026-08-15" })).toThrow(
        SeedValidationError,
      );
      try {
        validateSeedDirectory(root, { production: false, asOf: "2026-08-15" });
      } catch (error) {
        expect(
          (error as SeedValidationError).issues.some(
            (issue) => issue.code === "SOURCE_HOST_MISMATCH",
          ),
        ).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects an expired Source review", () => {
    const root = mkdtempSync(join(tmpdir(), "route-composer-source-expiry-gate-"));
    try {
      cpSync(fixtureRoot, root, { recursive: true });
      const sourceFile = join(root, "sources", "synthetic_source.json");
      const source = JSON.parse(readFileSync(sourceFile, "utf8")) as Record<string, unknown>;
      source.nextReviewAt = "2026-08-14";
      writeFileSync(sourceFile, `${JSON.stringify(source, null, 2)}\n`);

      expect(() => validateSeedDirectory(root, { production: false, asOf: "2026-08-15" })).toThrow(
        SeedValidationError,
      );
      try {
        validateSeedDirectory(root, { production: false, asOf: "2026-08-15" });
      } catch (error) {
        expect(
          (error as SeedValidationError).issues.some(
            (issue) => issue.code === "SOURCE_REVIEW_EXPIRED",
          ),
        ).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
