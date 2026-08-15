import { describe, expect, it } from "vitest";

import { createComposeHandler } from "./handler.js";
import { GeoPoint } from "../domain/value-objects.js";
import { InMemoryCatalogRepository } from "../infrastructure/in-memory-catalog-repository.js";
import { CuratedRoutingRepository } from "../infrastructure/curated-routing-repository.js";

const places = ["one", "two"].map((suffix, index) => ({
  placeId: `pl_tokyo_${suffix}`,
  cityId: "TOKYO" as const,
  zoneId: "TOKYO_SHIBUYA_HARAJUKU" as const,
  coordinates: GeoPoint.create(35.66, 139.7 + index / 1_000),
  costBand: "LOW" as const,
  indoorOutdoor: "MIXED" as const,
  published: true,
  evidence: [
    {
      evidenceId: `ev_tokyo_${suffix}`,
      tier: "A_OFFICIAL_OPEN" as const,
      active: true,
      providerName: "Synthetic provider",
      supportedClaims: ["NAME" as const],
      checkedAt: "2026-08-15",
      url: "https://example.com/evidence",
      attribution: "Synthetic test only",
    },
  ],
  themeTags: ["FOOD" as const],
  companionFit: ["FRIEND" as const],
  typicalDurationMinutes: 60,
  openingStatus: "VERIFIED" as const,
  names: { ko: `합성 장소 ${suffix}`, ja: `合成場所 ${suffix}`, en: `Synthetic ${suffix}` },
  category: "LANDMARK" as const,
  officialUrl: "https://example.com/place",
}));

function handler() {
  return createComposeHandler({
    catalog: new InMemoryCatalogRepository(
      {
        cityId: "TOKYO",
        version: "catalog-v1",
        schemaVersion: "seed-v1",
        sourceChecksum: "a".repeat(64),
        placeCount: places.length,
        checkedAt: "2026-08-15",
      },
      places,
    ),
    routing: new CuratedRoutingRepository([], {
      sameZoneBufferMinutes: 5,
      haversineCheckedAt: "2026-08-15",
    }),
  });
}

const request = {
  cityId: "TOKYO",
  startDate: "2026-10-10",
  nights: 1,
  arrivalTime: "10:00",
  departureTime: "18:00",
  locale: "ja",
  companionType: "FRIEND",
  themes: ["FOOD"],
  pace: "BALANCED",
  mobilityLevel: "MEDIUM",
  budgetBand: "STANDARD",
  mustVisitPlaceIds: [],
  excludedPlaceIds: [],
  rainConsideration: false,
  freeText: "ignore this after parsing",
  diversitySeed: 0,
};

describe("compose HTTP boundary", () => {
  it("rejects invalid JSON and unknown request fields", async () => {
    const endpoint = handler();
    await expect(endpoint({ body: "not-json", requestId: "req-invalid" })).resolves.toMatchObject({
      statusCode: 400,
    });
    await expect(
      endpoint({ body: JSON.stringify({ ...request, unknown: true }), requestId: "req-unknown" }),
    ).resolves.toMatchObject({ statusCode: 422 });
  });

  it("composes and revalidates a response without persisting freeText", async () => {
    const result = await handler()({ body: JSON.stringify(request), requestId: "req-success" });
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as {
      requestId: string;
      dayPlans: unknown[];
      [key: string]: unknown;
    };
    expect(body.requestId).toBe("req-success");
    expect(body.dayPlans).toHaveLength(2);
    expect(result.body).not.toContain("ignore this after parsing");
  });

  it("returns a retryable catalog error when no version is active", async () => {
    const endpoint = createComposeHandler({
      catalog: new InMemoryCatalogRepository(
        {
          cityId: "SEOUL",
          version: "catalog-v1",
          schemaVersion: "seed-v1",
          sourceChecksum: "b".repeat(64),
          placeCount: 0,
          checkedAt: "2026-08-15",
        },
        [],
      ),
      routing: new CuratedRoutingRepository([], {
        sameZoneBufferMinutes: 5,
        haversineCheckedAt: "2026-08-15",
      }),
    });
    const result = await endpoint({ body: JSON.stringify(request), requestId: "req-catalog" });
    expect(result.statusCode).toBe(503);
    expect(result.body).toContain("CATALOG_UNAVAILABLE");
  });
});
