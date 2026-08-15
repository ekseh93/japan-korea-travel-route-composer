import { describe, expect, it } from "vitest";

import { contractsPackageName } from "./index";

describe("contracts workspace boundary", () => {
  it("has a stable package identity", () => {
    expect(contractsPackageName).toBe("@route-composer/contracts");
  });
});
