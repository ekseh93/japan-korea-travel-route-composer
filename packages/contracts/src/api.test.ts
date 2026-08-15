import { describe, expect, it } from "vitest";

import {
  algorithmConstants,
  composeTripRequestSchema,
  composeTripResponseSchema,
  errorResponseSchema,
} from "./index";

const validRequest = {
  cityId: "SEOUL",
  startDate: "2026-10-10",
  nights: 2,
  arrivalTime: "10:00",
  departureTime: "18:00",
  locale: "ko",
  companionType: "FRIEND",
  themes: ["FOOD", "SHOPPING"],
  pace: "BALANCED",
  mobilityLevel: "MEDIUM",
  budgetBand: "STANDARD",
  mustVisitPlaceIds: [],
  excludedPlaceIds: [],
  rainConsideration: true,
  freeText: null,
  diversitySeed: 0,
} as const;

describe("TRC-API-001 request contract", () => {
  it("accepts the documented synthetic request", () => {
    expect(composeTripRequestSchema.parse(validRequest)).toEqual(validRequest);
  });

  it("rejects unknown fields and conflicting place constraints", () => {
    expect(() => composeTripRequestSchema.parse({ ...validRequest, extra: true })).toThrow();
    expect(() =>
      composeTripRequestSchema.parse({
        ...validRequest,
        mustVisitPlaceIds: ["pl_seoul_example"],
        excludedPlaceIds: ["pl_seoul_example"],
      }),
    ).toThrow();
  });
});

describe("TRC-DOM-001 policy contract", () => {
  it("keeps the approved algorithm constants explicit", () => {
    expect(algorithmConstants).toMatchObject({
      algorithmVersion: "algorithm-v1",
      maxFilteredCandidates: 30,
      beamWidth: 40,
      cacheTtlHours: 24,
    });
  });
});

describe("public response and error contract", () => {
  it("rejects a response visit without public evidence", () => {
    const response = {
      requestId: "req_001",
      tripId: "trip_001",
      catalogVersion: "catalog-v1",
      algorithmVersion: "algorithm-v1",
      generatedAt: "2026-10-01T00:00:00Z",
      cityId: "SEOUL",
      timezone: "Asia/Seoul",
      locale: "ko",
      diversitySeed: 0,
      nextDiversitySeed: null,
      summary: {
        dayCount: 1,
        visitCount: 1,
        totalVisitMinutes: 90,
        totalTravelMinutes: 0,
        estimatedWalkingMinutes: 0,
        confidence: "HIGH",
        assumptions: ["예상 이동시간입니다."],
      },
      dayPlans: [
        {
          dayIndex: 1,
          date: "2026-10-10",
          availableFrom: "10:00",
          availableUntil: "18:00",
          title: "합성 일정",
          zoneIds: ["SEOUL_HONGDAE_YEONNAM"],
          items: [
            {
              type: "VISIT",
              visitId: "visit_001",
              placeId: "pl_seoul_example",
              displayName: "합성 장소",
              localName: "합성 장소",
              zoneId: "SEOUL_HONGDAE_YEONNAM",
              coordinates: { latitude: 37.55, longitude: 126.92 },
              category: "DISTRICT_WALK",
              startTime: "10:00",
              endTime: "11:30",
              durationMinutes: 90,
              costBand: "FREE",
              indoorOutdoor: "MIXED",
              recommendationReasons: [],
              evidence: [],
              officialUrl: null,
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

    expect(() => composeTripResponseSchema.parse(response)).toThrow();
  });

  it("accepts the stable error envelope with empty optional arrays", () => {
    expect(
      errorResponseSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "입력값을 확인해 주세요.",
          retryable: false,
          correlationId: "req_error_001",
        },
      }),
    ).toMatchObject({ error: { fieldErrors: [], details: [], recoveryActions: [] } });
  });
});
