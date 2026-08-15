import { describe, expect, it } from "vitest";

import { appName, implementationMilestone } from "./app";

describe("web workspace boundary", () => {
  it("exposes the current implementation milestone", () => {
    expect(appName).toBe("한일 여행 동선 조합기");
    expect(implementationMilestone).toBe("LUN-010");
  });
});
