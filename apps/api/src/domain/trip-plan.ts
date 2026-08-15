import type {
  CityId,
  ClaimType,
  CompanionType,
  CostBand,
  IndoorOutdoor,
  Locale,
  MobilityLevel,
  Pace,
  BudgetBand,
  OpeningStatus,
  PlaceCategory,
  ThemeTag,
  ZoneId,
} from "@route-composer/contracts";

import { domainInvariant } from "./errors.js";
import { GeoPoint, TimeOfDay, TripWindow, TravelDuration } from "./value-objects.js";

export type TripRequest = {
  readonly cityId: CityId;
  readonly locale: Locale;
  readonly tripWindow: TripWindow;
  readonly companionType: CompanionType;
  readonly themes: readonly ThemeTag[];
  readonly pace: Pace;
  readonly mobilityLevel: MobilityLevel;
  readonly budgetBand: BudgetBand;
  readonly mustVisitPlaceIds: readonly string[];
  readonly excludedPlaceIds: readonly string[];
  readonly rainConsideration: boolean;
  readonly diversitySeed: number;
};

export type PublishedEvidence = {
  readonly evidenceId: string;
  readonly tier: "A_OFFICIAL_OPEN" | "B_LICENSED_EDITORIAL";
  readonly active: boolean;
  readonly providerName?: string;
  readonly supportedClaims?: readonly ClaimType[];
  readonly checkedAt?: string;
  readonly url?: string;
  readonly attribution?: string | null;
};

export type PlaceProfile = {
  readonly placeId: string;
  readonly cityId: CityId;
  readonly zoneId: ZoneId;
  readonly coordinates: GeoPoint;
  readonly costBand: CostBand;
  readonly indoorOutdoor: IndoorOutdoor;
  readonly published: boolean;
  readonly evidence: readonly PublishedEvidence[];
  readonly themeTags?: readonly ThemeTag[];
  readonly companionFit?: readonly CompanionType[];
  readonly typicalDurationMinutes?: number;
  readonly openingStatus?: OpeningStatus;
  readonly names?: Partial<Record<Locale, string | undefined>>;
  readonly category?: PlaceCategory;
  readonly officialUrl?: string | null;
};

export type Visit = {
  readonly kind: "VISIT";
  readonly visitId: string;
  readonly placeId: string;
  readonly start: TimeOfDay;
  readonly end: TimeOfDay;
  readonly durationMinutes: number;
};

export type TravelSegment = {
  readonly kind: "TRAVEL";
  readonly segmentId: string;
  readonly fromPlaceId: string;
  readonly toPlaceId: string;
  readonly start: TimeOfDay;
  readonly end: TimeOfDay;
  readonly duration: TravelDuration;
};

export type Break = {
  readonly kind: "BREAK";
  readonly breakId: string;
  readonly start: TimeOfDay;
  readonly end: TimeOfDay;
};

export type TimelineItem = Visit | TravelSegment | Break;

export type DayPlan = {
  readonly dayIndex: number;
  readonly availableFrom: TimeOfDay;
  readonly availableUntil: TimeOfDay;
  readonly items: readonly TimelineItem[];
};

function timelineWindow(item: TimelineItem): {
  readonly start: TimeOfDay;
  readonly end: TimeOfDay;
} {
  return { start: item.start, end: item.end };
}

function hasApprovedEvidence(place: PlaceProfile): boolean {
  return place.evidence.some((evidence) => evidence.active);
}

export class TripPlan {
  public readonly cityId: CityId;
  public readonly dayPlans: readonly DayPlan[];
  public readonly diversitySeed: number;

  private constructor(cityId: CityId, dayPlans: readonly DayPlan[], diversitySeed: number) {
    this.cityId = cityId;
    this.dayPlans = dayPlans;
    this.diversitySeed = diversitySeed;
  }

  public static create(
    request: TripRequest,
    dayPlans: readonly DayPlan[],
    places: readonly PlaceProfile[],
  ): TripPlan {
    domainInvariant(
      dayPlans.length === request.tripWindow.dayCount,
      "NO_FEASIBLE_PLAN",
      "Day plan count does not match the trip window.",
      [
        {
          code: "OUTSIDE_TRIP_WINDOW",
          field: "dayPlans",
          message: "Expected one DayPlan per travel day.",
        },
      ],
    );

    const placeById = new Map(places.map((place) => [place.placeId, place]));
    const visitedPlaceIds: string[] = [];

    for (const place of places) {
      domainInvariant(
        place.cityId === request.cityId,
        "PLACE_NOT_FOUND",
        `Place ${place.placeId} does not belong to the requested city.`,
      );
    }

    for (const dayPlan of dayPlans) {
      domainInvariant(
        dayPlan.dayIndex >= 1 && dayPlan.dayIndex <= dayPlans.length,
        "NO_FEASIBLE_PLAN",
        "Day index is outside the trip.",
      );
      for (const item of dayPlan.items) {
        const window = timelineWindow(item);
        domainInvariant(
          window.start.isAtOrBefore(window.end),
          "NO_FEASIBLE_PLAN",
          "Timeline item has an invalid time window.",
        );
        domainInvariant(
          dayPlan.availableFrom.isAtOrBefore(window.start) &&
            window.end.isAtOrBefore(dayPlan.availableUntil),
          "NO_FEASIBLE_PLAN",
          "Timeline item is outside the available day.",
          [
            {
              code: "OUTSIDE_TRIP_WINDOW",
              field: `dayPlans[${dayPlan.dayIndex - 1}].items`,
              message: "Timeline item exceeds the day window.",
            },
          ],
        );

        if (item.kind === "VISIT") {
          const place = placeById.get(item.placeId);
          domainInvariant(
            place !== undefined,
            "PLACE_NOT_FOUND",
            `Place ${item.placeId} is not in the active catalog.`,
            [
              {
                code: "CANDIDATE_SHORTAGE",
                relatedPlaceId: item.placeId,
                message: "Place is not available.",
              },
            ],
          );
          domainInvariant(
            place.published && hasApprovedEvidence(place),
            "NO_FEASIBLE_PLAN",
            `Place ${item.placeId} is not publishable.`,
            [
              {
                code: "SOURCE_REVIEW_REQUIRED",
                relatedPlaceId: item.placeId,
                message: "Place requires active Tier A/B evidence.",
              },
            ],
          );
          domainInvariant(
            item.durationMinutes === item.end.minutes - item.start.minutes,
            "NO_FEASIBLE_PLAN",
            "Visit duration does not match its time window.",
          );
          visitedPlaceIds.push(item.placeId);
        }
      }

      for (let index = 1; index < dayPlan.items.length; index += 1) {
        const previous = timelineWindow(dayPlan.items[index - 1]!);
        const current = timelineWindow(dayPlan.items[index]!);
        domainInvariant(
          previous.end.isAtOrBefore(current.start),
          "NO_FEASIBLE_PLAN",
          "Timeline items overlap.",
          [
            {
              code: "OUTSIDE_TRIP_WINDOW",
              field: `dayPlans[${dayPlan.dayIndex - 1}].items`,
              message: "Timeline items must be ordered without overlap.",
            },
          ],
        );
      }
    }

    const visited = new Set(visitedPlaceIds);
    for (const placeId of request.mustVisitPlaceIds) {
      domainInvariant(
        visitedPlaceIds.filter((visitedPlaceId) => visitedPlaceId === placeId).length === 1,
        "MUST_VISIT_UNAVAILABLE",
        `Required place ${placeId} must appear exactly once.`,
        [
          {
            code: "CANDIDATE_SHORTAGE",
            relatedPlaceId: placeId,
            message: "Required place is missing or duplicated.",
          },
        ],
      );
    }
    for (const placeId of request.excludedPlaceIds) {
      domainInvariant(
        !visited.has(placeId),
        "CONFLICTING_CONSTRAINTS",
        `Excluded place ${placeId} appears in the plan.`,
        [
          {
            code: "CONSTRAINT_INTERSECTION",
            relatedPlaceId: placeId,
            message: "Excluded place cannot be visited.",
          },
        ],
      );
    }

    return new TripPlan(request.cityId, dayPlans, request.diversitySeed);
  }
}
