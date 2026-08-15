import type { CostBand, ReasonCode, ThemeTag } from "@route-composer/contracts";
import { algorithmConstants } from "@route-composer/contracts";

import type { RoutingRepository } from "./ports/routing-repository.js";
import { domainInvariant } from "../domain/errors.js";
import type {
  DayPlan,
  PlaceProfile,
  TimelineItem,
  TravelSegment,
  TripRequest,
  Visit,
} from "../domain/trip-plan.js";
import { TripPlan } from "../domain/trip-plan.js";
import { Score, TimeOfDay, TravelDuration } from "../domain/value-objects.js";

const PACE_VISIT_LIMIT = { SLOW: 3, BALANCED: 5, FAST: 6 } as const;
const COST_ORDER: readonly CostBand[] = ["FREE", "LOW", "MEDIUM", "HIGH"];

export type CandidateScore = {
  readonly place: PlaceProfile;
  readonly score: Score;
  readonly matchedThemes: readonly ThemeTag[];
  readonly reasons: readonly ReasonCode[];
};

export type RainAlternativeCandidate = {
  readonly replacesPlaceId: string;
  readonly alternativePlaceId: string;
  readonly travelDeltaMinutes: number;
};

export type ComposeTripResult = {
  readonly plan: TripPlan;
  readonly candidates: readonly CandidateScore[];
  readonly rainAlternatives: readonly RainAlternativeCandidate[];
};

type BeamState = {
  readonly items: readonly TimelineItem[];
  readonly visitedIds: readonly string[];
  readonly zoneIds: readonly PlaceProfile["zoneId"][];
  readonly currentMinutes: number;
  readonly lastPlace?: PlaceProfile;
  readonly score: number;
};

function stableHash(seed: number, placeId: string): number {
  let hash = (seed ^ 2_166_136_261) >>> 0;
  for (const character of placeId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash;
}

function budgetFit(requested: CostBand, actual: CostBand): number {
  if (actual === "UNKNOWN") return 0.5;
  const requestedIndex = COST_ORDER.indexOf(requested);
  const actualIndex = COST_ORDER.indexOf(actual);
  if (requestedIndex < 0 || actualIndex < 0) return 0.5;
  return Math.max(0, 1 - Math.abs(requestedIndex - actualIndex) / COST_ORDER.length);
}

function hasApprovedEvidence(place: PlaceProfile): boolean {
  return place.published && place.evidence.some((evidence) => evidence.active);
}

function candidateScore(request: TripRequest, place: PlaceProfile): CandidateScore {
  const matchedThemes = (place.themeTags ?? []).filter((theme) => request.themes.includes(theme));
  const themeScore =
    request.themes.length === 0 ? 0.5 : matchedThemes.length / request.themes.length;
  const evidenceScore = place.evidence.some((evidence) => evidence.tier === "A_OFFICIAL_OPEN")
    ? 1
    : 0.8;
  const companionScore = place.companionFit?.includes(request.companionType) ? 1 : 0.3;
  const mobilityScore =
    place.indoorOutdoor === "OUTDOOR" && request.mobilityLevel === "LOW" ? 0.7 : 1;
  const openingScore =
    place.openingStatus === "VERIFIED" ? 1 : place.openingStatus === "UNKNOWN" ? 0.4 : 0.8;
  const score =
    100 *
    (themeScore * 0.3 +
      evidenceScore * 0.2 +
      ((companionScore + mobilityScore) / 2) * 0.15 +
      budgetFit(
        request.budgetBand === "SAVER"
          ? "LOW"
          : request.budgetBand === "FLEXIBLE"
            ? "HIGH"
            : "MEDIUM",
        place.costBand,
      ) *
        0.1 +
      openingScore * 0.1 +
      1 * 0.1 +
      0.5 * 0.05);
  return {
    place,
    score: Score.from(score),
    matchedThemes,
    reasons: [
      ...(matchedThemes.length > 0 ? (["THEME_MATCH"] as const) : []),
      ...(place.companionFit?.includes(request.companionType) ? (["COMPANION_FIT"] as const) : []),
      "EVIDENCE_QUALITY",
      "BUDGET_FIT",
      "OPENING_CERTAINTY",
    ],
  };
}

function availableWindow(
  request: TripRequest,
  dayIndex: number,
): { from: TimeOfDay; until: TimeOfDay } {
  const lastDay = request.tripWindow.dayCount;
  return {
    from: TimeOfDay.from(dayIndex === 1 ? request.tripWindow.arrivalTime.value : "10:00"),
    until: TimeOfDay.from(dayIndex === lastDay ? request.tripWindow.departureTime.value : "20:00"),
  };
}

function visitDuration(place: PlaceProfile): number {
  return place.typicalDurationMinutes ?? 60;
}

function timeAt(minutes: number): TimeOfDay {
  const hour = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const minute = (minutes % 60).toString().padStart(2, "0");
  return TimeOfDay.from(`${hour}:${minute}`);
}

function buildVisit(place: PlaceProfile, startMinutes: number, index: number): Visit {
  const endMinutes = startMinutes + visitDuration(place);
  return {
    kind: "VISIT",
    visitId: `visit_${index.toString().padStart(3, "0")}`,
    placeId: place.placeId,
    start: timeAt(startMinutes),
    end: timeAt(endMinutes),
    durationMinutes: visitDuration(place),
  };
}

function buildTravel(
  origin: PlaceProfile,
  destination: PlaceProfile,
  startMinutes: number,
  durationMinutes: number,
  index: number,
): TravelSegment {
  return {
    kind: "TRAVEL",
    segmentId: `travel_${index.toString().padStart(3, "0")}`,
    fromPlaceId: origin.placeId,
    toPlaceId: destination.placeId,
    start: timeAt(startMinutes),
    end: timeAt(startMinutes + durationMinutes),
    duration: TravelDuration.create(durationMinutes),
  };
}

function isRainAlternative(place: PlaceProfile): boolean {
  return place.indoorOutdoor === "INDOOR" || place.indoorOutdoor === "MIXED";
}

export class ComposeTripApplicationService {
  public async compose(
    request: TripRequest,
    places: readonly PlaceProfile[],
    routing: RoutingRepository,
  ): Promise<ComposeTripResult> {
    const rankedCandidates = places
      .filter(
        (place) =>
          place.cityId === request.cityId &&
          !request.excludedPlaceIds.includes(place.placeId) &&
          hasApprovedEvidence(place) &&
          place.openingStatus !== "UNKNOWN",
      )
      .map((place) => candidateScore(request, place))
      .sort((left, right) => {
        const scoreDelta = right.score.value - left.score.value;
        return scoreDelta !== 0
          ? scoreDelta
          : stableHash(request.diversitySeed, left.place.placeId) -
              stableHash(request.diversitySeed, right.place.placeId);
      });
    const requiredCandidates = rankedCandidates.filter((candidate) =>
      request.mustVisitPlaceIds.includes(candidate.place.placeId),
    );
    const candidates = [
      ...requiredCandidates,
      ...rankedCandidates.filter(
        (candidate) => !request.mustVisitPlaceIds.includes(candidate.place.placeId),
      ),
    ].slice(0, algorithmConstants.maxFilteredCandidates);

    const candidateIds = new Set(candidates.map((candidate) => candidate.place.placeId));
    for (const placeId of request.mustVisitPlaceIds) {
      domainInvariant(
        candidateIds.has(placeId),
        "MUST_VISIT_UNAVAILABLE",
        `Required place ${placeId} is unavailable.`,
        [
          {
            code: "CANDIDATE_SHORTAGE",
            relatedPlaceId: placeId,
            message: "Required place failed hard filters.",
          },
        ],
      );
    }
    domainInvariant(
      candidates.length > 0,
      "NO_FEASIBLE_PLAN",
      "No publishable candidate is available.",
    );

    const placeById = new Map(
      candidates.map((candidate) => [candidate.place.placeId, candidate.place]),
    );
    const visitedIds = new Set<string>();
    const dayPlans: DayPlan[] = [];
    let visitIndex = 1;

    for (let dayIndex = 1; dayIndex <= request.tripWindow.dayCount; dayIndex += 1) {
      const window = availableWindow(request, dayIndex);
      const visitLimit = Math.min(PACE_VISIT_LIMIT[request.pace], 2);
      let beam: BeamState[] = [
        {
          items: [],
          visitedIds: [],
          zoneIds: [],
          currentMinutes: window.from.minutes + 15,
          score: 0,
        },
      ];

      for (let step = 0; step < visitLimit; step += 1) {
        const expanded: BeamState[] = [];
        for (const state of beam) {
          for (const candidate of candidates) {
            if (
              visitedIds.has(candidate.place.placeId) ||
              state.visitedIds.includes(candidate.place.placeId)
            )
              continue;
            const zoneIds = state.zoneIds.includes(candidate.place.zoneId)
              ? state.zoneIds
              : [...state.zoneIds, candidate.place.zoneId];
            if (zoneIds.length > algorithmConstants.maxZonesPerDay) continue;
            let travelMinutes = 0;
            if (state.lastPlace !== undefined) {
              try {
                const route = await routing.estimate(
                  {
                    placeId: state.lastPlace.placeId,
                    cityId: state.lastPlace.cityId,
                    zoneId: state.lastPlace.zoneId,
                    coordinates: state.lastPlace.coordinates,
                  },
                  {
                    placeId: candidate.place.placeId,
                    cityId: candidate.place.cityId,
                    zoneId: candidate.place.zoneId,
                    coordinates: candidate.place.coordinates,
                  },
                );
                travelMinutes = route.durationMinutes;
              } catch {
                continue;
              }
            }
            const visitStart = state.currentMinutes + travelMinutes;
            const visitEnd = visitStart + visitDuration(candidate.place);
            if (visitEnd > window.until.minutes - 15) continue;
            const nextVisitIndex = visitIndex + state.visitedIds.length;
            const nextItems = [
              ...state.items,
              ...(state.lastPlace !== undefined && travelMinutes > 0
                ? [
                    buildTravel(
                      state.lastPlace,
                      candidate.place,
                      state.currentMinutes,
                      travelMinutes,
                      nextVisitIndex,
                    ),
                  ]
                : []),
              buildVisit(candidate.place, visitStart, nextVisitIndex),
            ];
            expanded.push({
              items: nextItems,
              visitedIds: [...state.visitedIds, candidate.place.placeId],
              zoneIds,
              currentMinutes: visitEnd,
              lastPlace: candidate.place,
              score:
                state.score +
                candidate.score.value -
                travelMinutes * 0.1 +
                (zoneIds.length > state.zoneIds.length ? -3 : 0) +
                (request.mustVisitPlaceIds.includes(candidate.place.placeId) ? 100 : 0),
            });
          }
        }
        if (expanded.length === 0) break;
        beam = expanded
          .sort((left, right) => {
            const scoreDelta = right.score - left.score;
            if (scoreDelta !== 0) return scoreDelta;
            return (
              stableHash(request.diversitySeed, left.lastPlace?.placeId ?? "") -
              stableHash(request.diversitySeed, right.lastPlace?.placeId ?? "")
            );
          })
          .slice(0, algorithmConstants.beamWidth);
      }

      const bestState = beam[0];
      if (bestState === undefined) {
        dayPlans.push({
          dayIndex,
          availableFrom: window.from,
          availableUntil: window.until,
          items: [],
        });
        continue;
      }
      dayPlans.push({
        dayIndex,
        availableFrom: window.from,
        availableUntil: window.until,
        items: bestState.items,
      });
      for (const placeId of bestState.visitedIds) visitedIds.add(placeId);
      visitIndex += bestState.visitedIds.length;
    }

    for (const placeId of request.mustVisitPlaceIds) {
      domainInvariant(
        visitedIds.has(placeId),
        "MUST_VISIT_UNAVAILABLE",
        `Required place ${placeId} could not fit the trip window.`,
        [
          {
            code: "OUTSIDE_TRIP_WINDOW",
            relatedPlaceId: placeId,
            message: "Required place did not fit a day.",
          },
        ],
      );
    }

    const plan: TripPlan = TripPlan.create(request, dayPlans, places);
    const rainAlternatives: RainAlternativeCandidate[] = [];
    if (request.rainConsideration) {
      for (const dayPlan of dayPlans) {
        for (const item of dayPlan.items) {
          if (item.kind !== "VISIT") continue;
          const original = placeById.get(item.placeId);
          if (original === undefined || original.indoorOutdoor !== "OUTDOOR") continue;
          const alternative = candidates.find(
            (candidate) =>
              !visitedIds.has(candidate.place.placeId) &&
              isRainAlternative(candidate.place) &&
              candidate.place.zoneId === original.zoneId,
          );
          if (alternative !== undefined) {
            rainAlternatives.push({
              replacesPlaceId: original.placeId,
              alternativePlaceId: alternative.place.placeId,
              travelDeltaMinutes: 0,
            });
          }
          if (rainAlternatives.length >= 2) return { plan, candidates, rainAlternatives };
        }
      }
    }
    return { plan, candidates, rainAlternatives };
  }
}
