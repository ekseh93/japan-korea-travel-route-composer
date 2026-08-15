import {
  composeTripRequestSchema,
  composeTripResponseSchema,
  type ComposeTripResponse,
  type ErrorCode,
} from "@route-composer/contracts";

import { ComposeTripApplicationService } from "../application/compose-trip.js";
import type { CatalogRepository } from "../application/ports/catalog-repository.js";
import type { RoutingRepository } from "../application/ports/routing-repository.js";
import { DomainError } from "../domain/errors.js";
import { TripWindow } from "../domain/value-objects.js";
import type { PlaceProfile, TripRequest } from "../domain/trip-plan.js";
import { RepositoryError } from "../infrastructure/repository-errors.js";
import { RoutingRepositoryError } from "../infrastructure/routing-errors.js";

export type HttpRequest = {
  readonly body: string | null;
  readonly requestId?: string;
};

export type HttpResponse = {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
};

export type ComposeHandlerDependencies = {
  readonly catalog: CatalogRepository;
  readonly routing: RoutingRepository;
  readonly composer?: ComposeTripApplicationService;
};

function response(statusCode: number, body: unknown): HttpResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function errorResponse(
  statusCode: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  retryable = false,
): HttpResponse {
  return response(statusCode, {
    error: {
      code,
      message,
      fieldErrors: [],
      details: [],
      recoveryActions: [],
      retryable,
      correlationId: requestId,
    },
  });
}

function dateAt(startDate: string, dayIndex: number): string {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex - 1);
  return date.toISOString().slice(0, 10);
}

function displayName(place: PlaceProfile, locale: "ko" | "ja" | "en"): string {
  return place.names?.[locale] ?? place.names?.en ?? place.placeId;
}

function localName(place: PlaceProfile): string {
  const locale = place.cityId === "TOKYO" ? "ja" : "ko";
  return place.names?.[locale] ?? place.names?.en ?? place.placeId;
}

function visitIdByPlaceId(
  result: Awaited<ReturnType<ComposeTripApplicationService["compose"]>>,
): Map<string, string> {
  return new Map(
    result.plan.dayPlans.flatMap((dayPlan) =>
      dayPlan.items
        .filter((item): item is Extract<typeof item, { kind: "VISIT" }> => item.kind === "VISIT")
        .map((item) => [item.placeId, item.visitId] as const),
    ),
  );
}

function toResponse(
  request: TripRequest,
  requestId: string,
  catalogVersion: string,
  result: Awaited<ReturnType<ComposeTripApplicationService["compose"]>>,
): ComposeTripResponse {
  const placeById = new Map(
    result.candidates.map((candidate) => [candidate.place.placeId, candidate.place]),
  );
  const candidateById = new Map(
    result.candidates.map((candidate) => [candidate.place.placeId, candidate]),
  );
  const visitIds = visitIdByPlaceId(result);
  const dayPlans = result.plan.dayPlans.map((dayPlan) => ({
    dayIndex: dayPlan.dayIndex,
    date: dateAt(request.tripWindow.startDate, dayPlan.dayIndex),
    availableFrom: dayPlan.availableFrom.value,
    availableUntil: dayPlan.availableUntil.value,
    title: `Day ${dayPlan.dayIndex}`,
    zoneIds: (() => {
      const zones = [
        ...new Set(
          dayPlan.items.flatMap((item) =>
            item.kind === "VISIT" ? [placeById.get(item.placeId)?.zoneId] : [],
          ),
        ),
      ].filter((zoneId): zoneId is NonNullable<typeof zoneId> => zoneId !== undefined);
      return zones.length > 0 ? zones : [result.candidates[0]!.place.zoneId];
    })(),
    items: dayPlan.items.map((item) => {
      if (item.kind === "TRAVEL") {
        return {
          type: "TRAVEL" as const,
          segmentId: item.segmentId,
          fromPlaceId: item.fromPlaceId,
          toPlaceId: item.toPlaceId,
          mode: "TRANSIT_ESTIMATE" as const,
          startTime: item.start.value,
          endTime: item.end.value,
          durationMinutes: item.duration.minutes,
          distanceMeters: null,
          confidence: "LOW" as const,
          method: "CURATED_ZONE_MATRIX" as const,
          verificationUrl: null,
        };
      }
      if (item.kind === "BREAK") {
        return {
          type: "BREAK" as const,
          breakId: item.breakId,
          breakType: "REST" as const,
          startTime: item.start.value,
          endTime: item.end.value,
          durationMinutes: item.end.minutes - item.start.minutes,
          note: "Rest break",
        };
      }
      const place = placeById.get(item.placeId);
      const candidate = candidateById.get(item.placeId);
      if (place === undefined || candidate === undefined || place.category === undefined) {
        throw new RepositoryError(`Place ${item.placeId} lacks a public response projection.`);
      }
      const evidence = place.evidence
        .filter((entry) => entry.active)
        .map((entry) => {
          if (
            entry.providerName === undefined ||
            entry.supportedClaims === undefined ||
            entry.checkedAt === undefined ||
            entry.url === undefined
          ) {
            throw new RepositoryError(`Evidence for ${item.placeId} lacks a public projection.`);
          }
          return {
            evidenceId: entry.evidenceId,
            tier: entry.tier,
            providerName: entry.providerName,
            supportedClaims: [...entry.supportedClaims],
            checkedAt: entry.checkedAt,
            url: entry.url,
            attribution: entry.attribution ?? null,
          };
        });
      return {
        type: "VISIT" as const,
        visitId: item.visitId,
        placeId: item.placeId,
        displayName: displayName(place, request.locale),
        localName: localName(place),
        zoneId: place.zoneId,
        coordinates: {
          latitude: place.coordinates.latitude,
          longitude: place.coordinates.longitude,
        },
        category: place.category,
        startTime: item.start.value,
        endTime: item.end.value,
        durationMinutes: item.durationMinutes,
        costBand: place.costBand,
        indoorOutdoor: place.indoorOutdoor,
        recommendationReasons: candidate.reasons.map((code) => ({
          code,
          text: code,
          scoreComponent: Math.round(candidate.score.value),
          supportedEvidenceIds: evidence.map((entry) => entry.evidenceId),
        })),
        evidence,
        officialUrl: place.officialUrl ?? null,
      };
    }),
    rainAlternatives: result.rainAlternatives
      .filter((alternative) => alternative.replacesPlaceId !== undefined)
      .map((alternative) => {
        const place = placeById.get(alternative.alternativePlaceId);
        const replacesVisitId = visitIds.get(alternative.replacesPlaceId);
        if (place === undefined || place.category === undefined || replacesVisitId === undefined)
          return null;
        const evidence = place.evidence.filter(
          (entry) =>
            entry.active &&
            entry.providerName &&
            entry.url &&
            entry.checkedAt &&
            entry.supportedClaims,
        );
        return {
          replacesVisitId,
          alternativePlaceId: alternative.alternativePlaceId,
          displayName: displayName(place, request.locale),
          startTime: "10:00",
          endTime: "11:00",
          travelDeltaMinutes: alternative.travelDeltaMinutes,
          reason: "Rain-compatible alternative in the same zone.",
          evidence: evidence.map((entry) => ({
            evidenceId: entry.evidenceId,
            tier: entry.tier,
            providerName: entry.providerName!,
            supportedClaims: [...entry.supportedClaims!],
            checkedAt: entry.checkedAt!,
            url: entry.url!,
            attribution: entry.attribution ?? null,
          })),
        };
      })
      .filter(
        (alternative): alternative is NonNullable<typeof alternative> => alternative !== null,
      ),
    warnings: [],
  }));
  return composeTripResponseSchema.parse({
    requestId,
    tripId: `${requestId}-${request.diversitySeed}`,
    catalogVersion,
    algorithmVersion: "algorithm-v1",
    generatedAt: new Date().toISOString(),
    cityId: request.cityId,
    timezone: request.cityId === "TOKYO" ? "Asia/Tokyo" : "Asia/Seoul",
    locale: request.locale,
    diversitySeed: request.diversitySeed,
    nextDiversitySeed: request.diversitySeed === 2_147_483_647 ? null : request.diversitySeed + 1,
    summary: {
      dayCount: dayPlans.length,
      visitCount: dayPlans.flatMap((day) => day.items).filter((item) => item.type === "VISIT")
        .length,
      totalVisitMinutes: dayPlans
        .flatMap((day) => day.items)
        .filter((item) => item.type === "VISIT")
        .reduce((total, item) => total + item.durationMinutes, 0),
      totalTravelMinutes: dayPlans
        .flatMap((day) => day.items)
        .filter((item) => item.type === "TRAVEL")
        .reduce((total, item) => total + item.durationMinutes, 0),
      estimatedWalkingMinutes: 0,
      confidence: "LOW",
      assumptions: [
        "Route durations are curated or Haversine estimates and must be verified before travel.",
      ],
    },
    dayPlans,
    warnings: [],
    methodologyPath: "/methodology",
    sourcePolicyPath: "/sources",
  });
}

export function createComposeHandler(dependencies: ComposeHandlerDependencies) {
  const composer = dependencies.composer ?? new ComposeTripApplicationService();
  return async function handle(request: HttpRequest): Promise<HttpResponse> {
    const requestId = request.requestId ?? "local-request";
    if (request.body === null)
      return errorResponse(400, "INVALID_REQUEST", "Request body is required.", requestId);
    let body: unknown;
    try {
      body = JSON.parse(request.body) as unknown;
    } catch {
      return errorResponse(400, "INVALID_REQUEST", "Request body must be valid JSON.", requestId);
    }
    const parsed = composeTripRequestSchema.safeParse(body);
    if (!parsed.success)
      return errorResponse(
        422,
        "INVALID_REQUEST",
        "Request does not match the API contract.",
        requestId,
      );
    try {
      const current = await dependencies.catalog.getCurrentVersion(parsed.data.cityId);
      if (current === null)
        return errorResponse(
          503,
          "CATALOG_UNAVAILABLE",
          "No active catalog is available.",
          requestId,
          true,
        );
      const places = await dependencies.catalog.getPublishedPlaces(
        parsed.data.cityId,
        current.version,
      );
      const tripRequest: TripRequest = {
        cityId: parsed.data.cityId,
        locale: parsed.data.locale,
        tripWindow: TripWindow.create(
          parsed.data.startDate,
          parsed.data.nights,
          parsed.data.arrivalTime,
          parsed.data.departureTime,
        ),
        companionType: parsed.data.companionType,
        themes: parsed.data.themes,
        pace: parsed.data.pace,
        mobilityLevel: parsed.data.mobilityLevel,
        budgetBand: parsed.data.budgetBand,
        mustVisitPlaceIds: parsed.data.mustVisitPlaceIds,
        excludedPlaceIds: parsed.data.excludedPlaceIds,
        rainConsideration: parsed.data.rainConsideration,
        diversitySeed: parsed.data.diversitySeed,
      };
      const result = await composer.compose(tripRequest, places, dependencies.routing);
      return response(200, toResponse(tripRequest, requestId, current.version, result));
    } catch (error) {
      if (error instanceof DomainError)
        return errorResponse(422, error.code, error.message, requestId);
      if (error instanceof RoutingRepositoryError)
        return errorResponse(503, "ROUTE_DATA_INCOMPLETE", error.message, requestId, true);
      if (error instanceof RepositoryError)
        return errorResponse(503, "CATALOG_UNAVAILABLE", error.message, requestId, true);
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "The request could not be completed.",
        requestId,
        true,
      );
    }
  };
}
