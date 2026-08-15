import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildProjection } from "./projection";
import {
  CurrentPointerConflictError,
  prepareCurrentPointers,
  promoteCurrentPointer,
} from "./current-pointer";

const fixtureRoot = resolve(process.cwd(), "../test-fixtures");
const buildOptions = {
  catalogVersion: "catalog-pointer-test-v1",
  generatedAt: "2026-08-15T00:00:00.000Z",
  reviewedBy: "test-curator",
  releaseNotes: "Pointer contract test",
  production: false,
  asOf: "2026-08-15",
} as const;

describe("catalog current pointer contract", () => {
  it("prepares one immutable pointer per city from a validated projection", () => {
    const result = buildProjection(fixtureRoot, buildOptions);

    expect(prepareCurrentPointers(result, "2026-08-15")).toEqual([
      {
        cityId: "TOKYO",
        version: "catalog-pointer-test-v1",
        schemaVersion: "api-v1",
        sourceChecksum: "83aa5f0606d27db73240bc8244162d11c40193604de76d50c68b1a5eb250d98b",
        placeCount: 6,
        checkedAt: "2026-08-15",
      },
      {
        cityId: "SEOUL",
        version: "catalog-pointer-test-v1",
        schemaVersion: "api-v1",
        sourceChecksum: "83aa5f0606d27db73240bc8244162d11c40193604de76d50c68b1a5eb250d98b",
        placeCount: 6,
        checkedAt: "2026-08-15",
      },
    ]);
  });

  it("allows an initial promotion and a compare-and-swap update", () => {
    const result = buildProjection(fixtureRoot, buildOptions);
    const next = prepareCurrentPointers(result, "2026-08-15")[0]!;

    expect(promoteCurrentPointer(null, next, null)).toBe(next);
    expect(
      promoteCurrentPointer({ ...next, version: "catalog-old-v1" }, next, "catalog-old-v1"),
    ).toBe(next);
  });

  it("rejects a stale expected version before pointer mutation", () => {
    const result = buildProjection(fixtureRoot, buildOptions);
    const next = prepareCurrentPointers(result, "2026-08-15")[0]!;

    expect(() =>
      promoteCurrentPointer({ ...next, version: "catalog-current-v2" }, next, "catalog-current-v1"),
    ).toThrow(CurrentPointerConflictError);
  });

  it("rejects an invalid pointer check date", () => {
    const result = buildProjection(fixtureRoot, buildOptions);

    expect(() => prepareCurrentPointers(result, "2026-8-15")).toThrow(RangeError);
  });
});
