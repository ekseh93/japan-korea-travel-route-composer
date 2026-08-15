import { describe, expect, it } from "vitest";

import { DomainError, GeoPoint, TimeOfDay, TripPlan, TripWindow } from "./index";
import type { DayPlan, PlaceProfile, TripRequest } from "./index";

const place: PlaceProfile = {
  placeId: "pl_seoul_example",
  cityId: "SEOUL",
  zoneId: "SEOUL_HONGDAE_YEONNAM",
  coordinates: GeoPoint.create(37.55, 126.92),
  costBand: "FREE",
  indoorOutdoor: "MIXED",
  published: true,
  evidence: [{ evidenceId: "ev_seoul_example_name", tier: "A_OFFICIAL_OPEN", active: true }],
};

const request: TripRequest = {
  cityId: "SEOUL",
  locale: "ko",
  tripWindow: TripWindow.create("2026-10-10", 1, "10:00", "18:00"),
  companionType: "FRIEND",
  themes: ["FOOD"],
  pace: "BALANCED",
  mobilityLevel: "MEDIUM",
  budgetBand: "STANDARD",
  mustVisitPlaceIds: [place.placeId],
  excludedPlaceIds: [],
  rainConsideration: true,
  diversitySeed: 0,
};

function validDay(items: DayPlan["items"], dayIndex = 1): DayPlan {
  return {
    dayIndex,
    availableFrom: TimeOfDay.from("10:00"),
    availableUntil: TimeOfDay.from("18:00"),
    items,
  };
}

function validVisit(overrides: Partial<Extract<DayPlan["items"][number], { kind: "VISIT" }>> = {}) {
  return {
    kind: "VISIT" as const,
    visitId: "visit_001",
    placeId: place.placeId,
    start: TimeOfDay.from("10:00"),
    end: TimeOfDay.from("11:30"),
    durationMinutes: 90,
    ...overrides,
  };
}

describe("TripPlan aggregate invariants", () => {
  it("accepts a feasible plan with the required place exactly once", () => {
    const plan = TripPlan.create(request, [validDay([validVisit()]), validDay([], 2)], [place]);
    expect(plan.dayPlans).toHaveLength(2);
  });

  it.each([
    ["day count", () => TripPlan.create(request, [], [place])],
    [
      "missing evidence",
      () => TripPlan.create(request, [validDay([validVisit()])], [{ ...place, evidence: [] }]),
    ],
    ["missing must visit", () => TripPlan.create(request, [validDay([])], [place])],
    [
      "excluded visit",
      () =>
        TripPlan.create(
          { ...request, mustVisitPlaceIds: [], excludedPlaceIds: [place.placeId] },
          [validDay([validVisit()])],
          [place],
        ),
    ],
    [
      "overlapping items",
      () =>
        TripPlan.create(
          request,
          [
            validDay([
              validVisit(),
              validVisit({ visitId: "visit_002", start: TimeOfDay.from("11:00") }),
            ]),
          ],
          [place],
        ),
    ],
  ])("rejects the %s invariant violation", (_name, createPlan) => {
    expect(createPlan).toThrow(DomainError);
  });
});

describe("domain value objects", () => {
  it("reject invalid coordinates and time windows", () => {
    expect(() => GeoPoint.create(91, 0)).toThrow(DomainError);
    expect(() => TimeOfDay.from("25:00")).toThrow(DomainError);
    expect(() => TripWindow.create("2026-10-10", 5, "10:00", "18:00")).toThrow(DomainError);
  });
});
