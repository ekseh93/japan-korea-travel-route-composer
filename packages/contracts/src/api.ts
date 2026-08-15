import { z } from "zod";

import {
  accessibilityFeatureSchema,
  breakTypeSchema,
  budgetBandSchema,
  cityIdSchema,
  claimTypeSchema,
  companionTypeSchema,
  confidenceSchema,
  costBandSchema,
  indoorOutdoorSchema,
  localeSchema,
  mobilityLevelSchema,
  paceSchema,
  placeCategorySchema,
  reasonCodeSchema,
  routeMethodSchema,
  themeTagSchema,
  travelModeSchema,
  warningCodeSchema,
  zoneIdSchema,
} from "./catalog.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.");
const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm.");
const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "Only HTTPS URLs are allowed.");
const placeIdSchema = z.string().regex(/^pl_[a-z0-9]+(?:_[a-z0-9]+)+$/);
const evidenceIdSchema = z.string().regex(/^ev_[a-z0-9]+(?:_[a-z0-9]+)+$/);
export const localizedTextSchema = z
  .object({
    ko: z.string().min(1).optional(),
    ja: z.string().min(1).optional(),
    en: z.string().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((text) => text !== undefined), {
    message: "At least one localized value is required.",
  });

export const composeTripRequestSchema = z
  .object({
    cityId: cityIdSchema,
    startDate: isoDateSchema,
    nights: z.number().int().min(1).max(4),
    arrivalTime: localTimeSchema,
    departureTime: localTimeSchema,
    locale: localeSchema,
    companionType: companionTypeSchema,
    themes: z
      .array(themeTagSchema)
      .max(5)
      .refine((values) => new Set(values).size === values.length, {
        message: "Themes must be unique.",
      }),
    pace: paceSchema,
    mobilityLevel: mobilityLevelSchema,
    budgetBand: budgetBandSchema,
    mustVisitPlaceIds: z.array(placeIdSchema).max(4),
    excludedPlaceIds: z.array(placeIdSchema).max(10),
    rainConsideration: z.boolean(),
    freeText: z.string().max(200).nullable().optional(),
    diversitySeed: z.number().int().min(0).max(2_147_483_647),
  })
  .strict()
  .superRefine((value, context) => {
    const mustVisit = new Set(value.mustVisitPlaceIds);
    const duplicate = value.excludedPlaceIds.find((placeId) => mustVisit.has(placeId));

    if (duplicate !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["excludedPlaceIds"],
        message: `Place ${duplicate} cannot be both required and excluded.`,
      });
    }

    if (new Set(value.mustVisitPlaceIds).size !== value.mustVisitPlaceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["mustVisitPlaceIds"],
        message: "Required places must be unique.",
      });
    }

    if (new Set(value.excludedPlaceIds).size !== value.excludedPlaceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["excludedPlaceIds"],
        message: "Excluded places must be unique.",
      });
    }
  });

export const coordinatesSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();

export const publicEvidenceSchema = z
  .object({
    evidenceId: evidenceIdSchema,
    tier: z.enum(["A_OFFICIAL_OPEN", "B_LICENSED_EDITORIAL"]),
    providerName: z.string().min(1).max(120),
    supportedClaims: z.array(claimTypeSchema).min(1),
    checkedAt: isoDateSchema,
    url: httpsUrlSchema,
    attribution: z.string().max(240).nullable(),
  })
  .strict();

export const recommendationReasonSchema = z
  .object({
    code: reasonCodeSchema,
    text: z.string().min(1).max(500),
    scoreComponent: z.number().int().min(0).max(100),
    supportedEvidenceIds: z.array(evidenceIdSchema),
  })
  .strict();

const visitSchema = z
  .object({
    type: z.literal("VISIT"),
    visitId: z.string().min(1),
    placeId: placeIdSchema,
    displayName: z.string().min(1),
    localName: z.string().min(1),
    zoneId: zoneIdSchema,
    coordinates: coordinatesSchema,
    category: placeCategorySchema,
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    durationMinutes: z.number().int().min(15).max(360),
    costBand: costBandSchema,
    indoorOutdoor: indoorOutdoorSchema,
    recommendationReasons: z.array(recommendationReasonSchema).min(1),
    evidence: z.array(publicEvidenceSchema).min(1),
    officialUrl: httpsUrlSchema.nullable(),
  })
  .strict();

const travelSchema = z
  .object({
    type: z.literal("TRAVEL"),
    segmentId: z.string().min(1),
    fromPlaceId: placeIdSchema,
    toPlaceId: placeIdSchema,
    mode: travelModeSchema,
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    durationMinutes: z.number().int().min(1),
    distanceMeters: z.number().int().min(0).nullable(),
    confidence: confidenceSchema,
    method: routeMethodSchema,
    verificationUrl: httpsUrlSchema.nullable(),
  })
  .strict();

const breakSchema = z
  .object({
    type: z.literal("BREAK"),
    breakId: z.string().min(1),
    breakType: breakTypeSchema,
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    durationMinutes: z.number().int().min(15).max(90),
    note: z.string().min(1).max(240),
  })
  .strict();

export const warningSchema = z
  .object({
    code: warningCodeSchema,
    message: z.string().min(1).max(500),
    affectedPlaceIds: z.array(placeIdSchema),
    verificationUrl: httpsUrlSchema.nullable(),
  })
  .strict();

export const rainAlternativeSchema = z
  .object({
    replacesVisitId: z.string().min(1),
    alternativePlaceId: placeIdSchema,
    displayName: z.string().min(1),
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    travelDeltaMinutes: z.number().int(),
    reason: z.string().min(1).max(500),
    evidence: z.array(publicEvidenceSchema).min(1),
  })
  .strict();

export const timelineItemSchema = z.discriminatedUnion("type", [
  visitSchema,
  travelSchema,
  breakSchema,
]);

export const dayPlanSchema = z
  .object({
    dayIndex: z.number().int().min(1),
    date: isoDateSchema,
    availableFrom: localTimeSchema,
    availableUntil: localTimeSchema,
    title: z.string().min(1),
    zoneIds: z.array(zoneIdSchema).min(1).max(2),
    items: z.array(timelineItemSchema),
    rainAlternatives: z.array(rainAlternativeSchema),
    warnings: z.array(warningSchema),
  })
  .strict();

export const tripSummarySchema = z
  .object({
    dayCount: z.number().int().min(1),
    visitCount: z.number().int().min(0),
    totalVisitMinutes: z.number().int().min(0),
    totalTravelMinutes: z.number().int().min(0),
    estimatedWalkingMinutes: z.number().int().min(0),
    confidence: confidenceSchema,
    assumptions: z.array(z.string().min(1)),
  })
  .strict();

export const composeTripResponseSchema = z
  .object({
    requestId: z.string().min(1),
    tripId: z.string().min(1),
    catalogVersion: z.string().min(1),
    algorithmVersion: z.string().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    cityId: cityIdSchema,
    timezone: z.enum(["Asia/Tokyo", "Asia/Seoul"]),
    locale: localeSchema,
    diversitySeed: z.number().int().min(0).max(2_147_483_647),
    nextDiversitySeed: z.number().int().min(0).max(2_147_483_647).nullable(),
    summary: tripSummarySchema,
    dayPlans: z.array(dayPlanSchema).min(1),
    warnings: z.array(warningSchema),
    methodologyPath: z.literal("/methodology"),
    sourcePolicyPath: z.literal("/sources"),
  })
  .strict();

export const errorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "REQUEST_TOO_LARGE",
  "PLACE_NOT_FOUND",
  "CATALOG_VERSION_CHANGED",
  "CONFLICTING_CONSTRAINTS",
  "MUST_VISIT_UNAVAILABLE",
  "NO_FEASIBLE_PLAN",
  "ROUTE_DATA_INCOMPLETE",
  "RATE_LIMITED",
  "CATALOG_UNAVAILABLE",
  "TEMPORARILY_UNAVAILABLE",
  "INTERNAL_ERROR",
]);
export const detailCodeSchema = z.enum([
  "REQUIRED",
  "INVALID_FORMAT",
  "OUT_OF_RANGE",
  "TOO_LONG",
  "TOO_MANY_ITEMS",
  "UNKNOWN_FIELD",
  "DUPLICATE_VALUE",
  "CITY_MISMATCH",
  "CONSTRAINT_INTERSECTION",
  "PLACE_CLOSED",
  "OUTSIDE_TRIP_WINDOW",
  "SOURCE_REVIEW_REQUIRED",
  "ROUTE_MISSING",
  "CANDIDATE_SHORTAGE",
]);
export const recoveryActionCodeSchema = z.enum([
  "EDIT_FIELD",
  "CHANGE_DATE",
  "REMOVE_MUST_VISIT",
  "REMOVE_EXCLUSION",
  "RELAX_MOBILITY",
  "RELAX_BUDGET",
  "CHANGE_THEME",
  "RETRY",
]);

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: errorCodeSchema,
        message: z.string().min(1).max(500),
        fieldErrors: z
          .array(
            z
              .object({
                field: z.string().min(1),
                reason: detailCodeSchema,
                message: z.string().min(1).max(500),
              })
              .strict(),
          )
          .default([]),
        details: z
          .array(
            z
              .object({
                code: detailCodeSchema,
                message: z.string().min(1).max(500),
                field: z.string().min(1).optional(),
                relatedPlaceId: placeIdSchema.optional(),
              })
              .strict(),
          )
          .default([]),
        recoveryActions: z
          .array(
            z
              .object({
                code: recoveryActionCodeSchema,
                field: z.string().min(1).optional(),
                message: z.string().min(1).max(500),
              })
              .strict(),
          )
          .default([]),
        retryable: z.boolean(),
        correlationId: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export const catalogMetaResponseSchema = z
  .object({
    cityId: cityIdSchema,
    catalogVersion: z.string().min(1),
    schemaVersion: z.string().min(1),
    placeCount: z.number().int().min(0),
    checkedAt: isoDateSchema,
    availableThemes: z.array(themeTagSchema),
    availableZoneIds: z.array(zoneIdSchema),
    dataNotice: z.string().min(1),
  })
  .strict();

export const catalogPlaceItemSchema = z
  .object({
    placeId: placeIdSchema,
    displayName: z.string().min(1),
    localName: z.string().min(1),
    zoneId: zoneIdSchema,
    category: placeCategorySchema,
    themeTags: z.array(themeTagSchema),
  })
  .strict();

export const catalogPlacesResponseSchema = z
  .object({
    cityId: cityIdSchema,
    catalogVersion: z.string().min(1),
    items: z.array(catalogPlaceItemSchema).max(20),
  })
  .strict();

export const healthResponseSchema = z
  .object({
    status: z.literal("ok"),
    releaseSha: z.string().min(1),
  })
  .strict();

export type ComposeTripRequest = z.infer<typeof composeTripRequestSchema>;
export type ComposeTripResponse = z.infer<typeof composeTripResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type DetailCode = z.infer<typeof detailCodeSchema>;
export type RecoveryActionCode = z.infer<typeof recoveryActionCodeSchema>;
export type CatalogMetaResponse = z.infer<typeof catalogMetaResponseSchema>;
export type CatalogPlacesResponse = z.infer<typeof catalogPlacesResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type AccessibilityFeature = z.infer<typeof accessibilityFeatureSchema>;
