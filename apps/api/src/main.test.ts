import { describe, expect, it } from "vitest";

import { apiPackageName } from "./main";

describe("API workspace boundary", () => {
  it("has a stable package identity", () => {
    expect(apiPackageName).toBe("@route-composer/api");
  });
});
