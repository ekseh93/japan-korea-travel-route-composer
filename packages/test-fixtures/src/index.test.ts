import { describe, expect, it } from "vitest";

import { syntheticFixtureManifest, testFixturesPackageName } from "./index";

describe("test fixtures workspace boundary", () => {
  it("has a stable package identity", () => {
    expect(testFixturesPackageName).toBe("@route-composer/test-fixtures");
  });

  it("contains only synthetic data for both MVP cities", () => {
    expect(syntheticFixtureManifest).toEqual({
      cities: ["TOKYO", "SEOUL"],
      placeCount: 12,
      evidenceCount: 12,
      goldenRequestCount: 8,
      rightsBasis: "TEST_FIXTURE_ONLY",
    });
  });
});
