import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const composeResponse = {
  requestId: "e2e-request",
  tripId: "trip_e2e",
  catalogVersion: "fixture-v1",
  algorithmVersion: "route-composer-v1",
  generatedAt: "2026-08-15T00:00:00.000Z",
  cityId: "TOKYO",
  timezone: "Asia/Tokyo",
  locale: "ja",
  diversitySeed: 0,
  nextDiversitySeed: 1,
  summary: {
    dayCount: 1,
    visitCount: 1,
    totalVisitMinutes: 60,
    totalTravelMinutes: 0,
    estimatedWalkingMinutes: 0,
    confidence: "HIGH",
    assumptions: ["Synthetic E2E response only."],
  },
  dayPlans: [
    {
      dayIndex: 1,
      date: "2026-10-10",
      availableFrom: "10:00",
      availableUntil: "18:00",
      title: "東京の検証ルート",
      zoneIds: ["TOKYO_SHIBUYA_HARAJUKU"],
      items: [
        {
          type: "VISIT",
          visitId: "visit_e2e",
          placeId: "pl_tokyo_e2e_place",
          displayName: "E2E 表参道",
          localName: "E2E 表参道",
          zoneId: "TOKYO_SHIBUYA_HARAJUKU",
          coordinates: { latitude: 35.6652, longitude: 139.7123 },
          category: "DISTRICT_WALK",
          startTime: "10:00",
          endTime: "11:00",
          durationMinutes: 60,
          costBand: "FREE",
          indoorOutdoor: "OUTDOOR",
          recommendationReasons: [
            {
              code: "THEME_MATCH",
              text: "합성 E2E 응답입니다.",
              scoreComponent: 80,
              supportedEvidenceIds: ["ev_tokyo_e2e_source"],
            },
          ],
          evidence: [
            {
              evidenceId: "ev_tokyo_e2e_source",
              tier: "A_OFFICIAL_OPEN",
              providerName: "Synthetic E2E Source",
              supportedClaims: ["NAME"],
              checkedAt: "2026-08-15",
              url: "https://example.com/e2e-source",
              attribution: "TEST_FIXTURE_ONLY",
            },
          ],
          officialUrl: "https://example.com/e2e-place",
        },
      ],
      rainAlternatives: [],
      warnings: [],
    },
  ],
  warnings: [],
  methodologyPath: "/methodology",
  sourcePolicyPath: "/sources",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/v1/trips:compose", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(composeResponse),
    });
  });
});

test("composes a route with keyboard-accessible controls and source link", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "동선 조합하기" }).focus();
  await expect(page.getByRole("button", { name: "동선 조합하기" })).toBeFocused();
  await page.getByRole("button", { name: "동선 조합하기" }).press("Enter");
  await expect(page.getByText("제약 조건을 확인한 동선을 만들었습니다.")).toBeVisible();
  await expect(page.locator(".timeline-item.visit").getByText("E2E 表参道")).toBeVisible();
  await expect(page.getByRole("link", { name: "Synthetic E2E Source 출처" })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
});

test("has no axe violations and fits the 360px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("keeps the text itinerary when map tiles are blocked", async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "동선 조합하기" }).click();
  await expect(page.getByText("지도를 불러오지 못해 텍스트 일정으로 표시합니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: "지도에서 장소 확인" })).toBeVisible();
  await expect(page.locator(".timeline-item.visit").getByText("E2E 表参道")).toBeVisible();
});
