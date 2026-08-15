import { resolve } from "node:path";

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
});
