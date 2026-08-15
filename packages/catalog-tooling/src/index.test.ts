import { describe, expect, it } from "vitest";

import { catalogToolingPackageName } from "./index";

describe("catalog tooling workspace boundary", () => {
  it("has a stable package identity", () => {
    expect(catalogToolingPackageName).toBe("@route-composer/catalog-tooling");
  });
});
