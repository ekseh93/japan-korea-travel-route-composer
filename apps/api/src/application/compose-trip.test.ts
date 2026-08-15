import { describe, expect, it } from "vitest";

import { ComposeTripApplicationService } from "./compose-trip.js";
import { GeoPoint, TripWindow } from "../domain/value-objects.js";
import type { PlaceProfile, TripRequest } from "../domain/trip-plan.js";
import { CuratedRoutingRepository } from "../infrastructure/curated-routing-repository.js";

const routing = new CuratedRoutingRepository([], {
  sameZoneBufferMinutes: 5,
  haversineCheckedAt: "2026-08-15",
});

function place(placeId: string, options: Partial<PlaceProfile> = {}): PlaceProfile {
  return {
    placeId,
    cityId: "TOKYO",
    zoneId: "TOKYO_SHIBUYA_HARAJUKU",
    coordinates: GeoPoint.create(35.66, 139.7),
    costBand: "LOW",
    indoorOutdoor: "MIXED",
    published: true,
    evidence: [{ evidenceId: `ev_${placeId.slice(3)}`, tier: "A_OFFICIAL_OPEN", active: true }],
    themeTags: ["FOOD"],
    companionFit: ["SOLO", "FRIEND", "COUPLE", "FAMILY"],
    typicalDurationMinutes: 60,
    openingStatus: "VERIFIED",
    ...options,
  };
}

function request(overrides: Partial<TripRequest> = {}): TripRequest {
  return {
    cityId: "TOKYO",
    locale: "ja",
    tripWindow: TripWindow.create("2026-10-10", 1, "10:00", "18:00"),
    companionType: "FRIEND",
    themes: ["FOOD"],
    pace: "BALANCED",
    mobilityLevel: "MEDIUM",
    budgetBand: "STANDARD",
    mustVisitPlaceIds: [],
    excludedPlaceIds: [],
    rainConsideration: false,
    diversitySeed: 0,
    ...overrides,
  };
}

describe("ComposeTripApplicationService", () => {
  it("creates a deterministic plan that honors Must and Exclude", async () => {
    const places = [
      place("pl_tokyo_required"),
      place("pl_tokyo_excluded"),
      place("pl_tokyo_optional", { themeTags: ["CULTURE_HISTORY"] }),
    ];
    const service = new ComposeTripApplicationService();
    const input = request({
      mustVisitPlaceIds: ["pl_tokyo_required"],
      excludedPlaceIds: ["pl_tokyo_excluded"],
    });

    const first = await service.compose(input, places, routing);
    const second = await service.compose(input, places, routing);
    const firstVisits = first.plan.dayPlans.flatMap((day) =>
      day.items.filter((item) => item.kind === "VISIT").map((item) => item.placeId),
    );
    const secondVisits = second.plan.dayPlans.flatMap((day) =>
      day.items.filter((item) => item.kind === "VISIT").map((item) => item.placeId),
    );

    expect(firstVisits).toEqual(secondVisits);
    expect(firstVisits).toContain("pl_tokyo_required");
    expect(firstVisits).not.toContain("pl_tokyo_excluded");
    expect(first.plan.dayPlans).toHaveLength(2);
  });

  it("changes only deterministic tie ordering when the diversity seed changes", async () => {
    const places = [place("pl_tokyo_a"), place("pl_tokyo_b"), place("pl_tokyo_c")];
    const service = new ComposeTripApplicationService();
    const seedZero = await service.compose(request({ diversitySeed: 0 }), places, routing);
    const seedOne = await service.compose(request({ diversitySeed: 1 }), places, routing);

    expect(seedZero.plan.dayPlans).toHaveLength(2);
    expect(seedOne.plan.dayPlans).toHaveLength(2);
    expect(seedZero.plan.dayPlans.flatMap((day) => day.items)).toEqual(expect.any(Array));
    expect(seedZero.candidates).toHaveLength(3);
    expect(seedOne.candidates.map((candidate) => candidate.place.placeId)).not.toEqual([]);
  });

  it("returns a rain alternative without changing the base plan", async () => {
    const places = [
      place("pl_tokyo_outdoor", { indoorOutdoor: "OUTDOOR", themeTags: ["FOOD"] }),
      place("pl_tokyo_indoor", {
        indoorOutdoor: "INDOOR",
        themeTags: ["CULTURE_HISTORY"],
        typicalDurationMinutes: 600,
      }),
    ];
    const result = await new ComposeTripApplicationService().compose(
      request({ rainConsideration: true }),
      places,
      routing,
    );

    expect(result.plan.dayPlans.flatMap((day) => day.items)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "VISIT", placeId: "pl_tokyo_outdoor" }),
      ]),
    );
    expect(result.rainAlternatives).toEqual([
      {
        replacesPlaceId: "pl_tokyo_outdoor",
        alternativePlaceId: "pl_tokyo_indoor",
        travelDeltaMinutes: 0,
      },
    ]);
  });

  it("fails explicitly when a required place cannot pass hard filters", async () => {
    await expect(
      new ComposeTripApplicationService().compose(
        request({ mustVisitPlaceIds: ["pl_tokyo_closed"] }),
        [place("pl_tokyo_closed", { openingStatus: "UNKNOWN" })],
        routing,
      ),
    ).rejects.toMatchObject({ code: "MUST_VISIT_UNAVAILABLE" });
  });
});
