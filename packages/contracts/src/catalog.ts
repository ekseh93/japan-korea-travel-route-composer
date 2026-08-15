import { z } from "zod";

export const cityIdSchema = z.enum(["TOKYO", "SEOUL"]);
export const localeSchema = z.enum(["ko", "ja", "en"]);
export const zoneIdSchema = z.enum([
  "TOKYO_SHIBUYA_HARAJUKU",
  "TOKYO_SHINJUKU",
  "TOKYO_GINZA_MARUNOUCHI",
  "TOKYO_ASAKUSA_UENO",
  "TOKYO_AKIHABARA_KANDA",
  "TOKYO_ROPPONGI_AKASAKA",
  "TOKYO_ODAIBA_TOYOSU",
  "TOKYO_NAKAMEGURO_DAIKANYAMA",
  "SEOUL_HONGDAE_YEONNAM",
  "SEOUL_MYEONGDONG_NAMSAN",
  "SEOUL_JONGNO_BUKCHON",
  "SEOUL_GANGNAM",
  "SEOUL_SEONGSU_SEOULFOREST",
  "SEOUL_ITAEWON_HANNAM",
  "SEOUL_JAMSIL",
  "SEOUL_YEOUIDO",
]);

export const companionTypeSchema = z.enum(["SOLO", "FRIEND", "COUPLE", "FAMILY"]);
export const themeTagSchema = z.enum([
  "LOCAL_MOOD",
  "FOOD",
  "SHOPPING",
  "CULTURE_HISTORY",
  "NATURE_PARK",
  "NIGHT_VIEW",
  "CAFE",
  "ART_DESIGN",
  "KIDS_FAMILY",
  "RELAXATION",
]);
export const paceSchema = z.enum(["SLOW", "BALANCED", "FAST"]);
export const mobilityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const budgetBandSchema = z.enum(["SAVER", "STANDARD", "FLEXIBLE"]);

export const placeCategorySchema = z.enum([
  "DISTRICT_WALK",
  "LANDMARK",
  "CULTURE_SITE",
  "MUSEUM_GALLERY",
  "PARK_NATURE",
  "MARKET_FOOD",
  "RESTAURANT",
  "CAFE_DESSERT",
  "SHOPPING",
  "VIEWPOINT",
  "EXPERIENCE",
  "NIGHTLIFE_AREA",
]);
export const costBandSchema = z.enum(["FREE", "LOW", "MEDIUM", "HIGH", "UNKNOWN"]);
export const indoorOutdoorSchema = z.enum(["INDOOR", "OUTDOOR", "MIXED", "UNKNOWN"]);
export const openingStatusSchema = z.enum(["VERIFIED", "OPEN_SPACE", "UNKNOWN"]);
export const accessibilityFeatureSchema = z.enum([
  "STEP_FREE_VERIFIED",
  "ELEVATOR_VERIFIED",
  "WHEELCHAIR_RESTROOM_VERIFIED",
  "STROLLER_FRIENDLY_VERIFIED",
  "SEATING_AVAILABLE_VERIFIED",
  "UNKNOWN",
]);

export const evidenceTierSchema = z.enum([
  "A_OFFICIAL_OPEN",
  "B_LICENSED_EDITORIAL",
  "C_COMMUNITY_POINTER",
]);
export const sourceReviewStatusSchema = z.enum([
  "APPROVED_OPEN",
  "CONDITIONAL",
  "MANUAL_LINK_ONLY",
  "BLOCKED",
  "UNVERIFIED",
]);
export const placePublicationStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]);
export const evidencePublicationStatusSchema = z.enum([
  "APPROVED",
  "REVIEW_REQUIRED",
  "BLOCKED",
  "RETIRED",
]);
export const claimTypeSchema = z.enum([
  "NAME",
  "ADDRESS",
  "COORDINATES",
  "OPENING_HOURS",
  "OFFICIAL_URL",
  "CATEGORY",
  "COST_BAND",
  "TYPICAL_DURATION",
  "ACCESSIBILITY",
  "EDITORIAL_FEATURE",
]);

export const travelModeSchema = z.enum(["WALK", "TRANSIT_ESTIMATE"]);
export const routeMethodSchema = z.enum(["HAVERSINE", "CURATED_ZONE_MATRIX", "PROVIDER"]);
export const confidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const breakTypeSchema = z.enum(["MEAL", "REST"]);
export const reasonCodeSchema = z.enum([
  "THEME_MATCH",
  "COMPANION_FIT",
  "MOBILITY_FIT",
  "BUDGET_FIT",
  "EVIDENCE_QUALITY",
  "OPENING_CERTAINTY",
  "ROUTE_COHESION",
  "CATEGORY_DIVERSITY",
  "MUST_VISIT",
  "RAIN_ALTERNATIVE",
]);
export const warningCodeSchema = z.enum([
  "TRAVEL_TIME_ESTIMATE",
  "VERIFY_OPENING_HOURS",
  "VERIFY_PRICE",
  "LOW_ROUTE_CONFIDENCE",
  "PROVIDER_FALLBACK_USED",
  "MAP_UNAVAILABLE",
  "AI_FALLBACK_USED",
  "SOURCE_REVIEW_DUE",
  "BUDGET_UNKNOWN",
  "NO_RAIN_ALTERNATIVE",
  "NO_DIVERSE_ALTERNATIVE",
]);

const catalogIsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const catalogHttpsUrlSchema = z.string().url().startsWith("https://");
const catalogLocalizedTextSchema = z
  .object({
    ko: z.string().min(1).optional(),
    ja: z.string().min(1).optional(),
    en: z.string().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((text) => text !== undefined));

export const publishedEvidenceSchema = z
  .object({
    evidenceId: z.string().min(1),
    tier: z.enum(["A_OFFICIAL_OPEN", "B_LICENSED_EDITORIAL"]),
    active: z.boolean(),
    providerName: z.string().min(1),
    supportedClaims: z.array(claimTypeSchema).min(1),
    checkedAt: catalogIsoDateSchema,
    url: catalogHttpsUrlSchema,
    attribution: z.string().nullable(),
  })
  .strict();

export const publishedPlaceSchema = z
  .object({
    placeId: z.string().min(1),
    cityId: cityIdSchema,
    zoneId: zoneIdSchema,
    names: catalogLocalizedTextSchema,
    category: placeCategorySchema,
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    costBand: costBandSchema,
    indoorOutdoor: indoorOutdoorSchema,
    themeTags: z.array(themeTagSchema).min(1),
    companionFit: z.array(companionTypeSchema).min(1),
    typicalDurationMinutes: z.number().int().min(15).max(360),
    openingStatus: openingStatusSchema,
    officialUrl: catalogHttpsUrlSchema.nullable(),
    published: z.literal(true),
    evidence: z.array(publishedEvidenceSchema).min(1),
  })
  .strict();

export const algorithmConstants = {
  algorithmVersion: "algorithm-v1",
  schemaVersion: "api-v1",
  maxFilteredCandidates: 30,
  beamWidth: 40,
  maxZonesPerDay: 2,
  walkSpeedMetersPerMinute: 75,
  walkRoundingMinutes: 5,
  cacheTtlHours: 24,
  defaultFirstDayStart: "10:00",
  defaultMiddleDayStart: "10:00",
  defaultMiddleDayEnd: "20:00",
  defaultLastDayEnd: "18:00",
  mealBreakMinutes: 60,
  dayEdgeBufferMinutes: 15,
  longWindowMealThresholdMinutes: 240,
  rainAlternativeLimit: 2,
  regenerationMaxOverlapPercent: 70,
} as const;

export const cityTimezone: Record<CityId, string> = {
  TOKYO: "Asia/Tokyo",
  SEOUL: "Asia/Seoul",
};

export type CityId = z.infer<typeof cityIdSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type ZoneId = z.infer<typeof zoneIdSchema>;
export type CompanionType = z.infer<typeof companionTypeSchema>;
export type ThemeTag = z.infer<typeof themeTagSchema>;
export type Pace = z.infer<typeof paceSchema>;
export type MobilityLevel = z.infer<typeof mobilityLevelSchema>;
export type BudgetBand = z.infer<typeof budgetBandSchema>;
export type ClaimType = z.infer<typeof claimTypeSchema>;
export type PlaceCategory = z.infer<typeof placeCategorySchema>;
export type CostBand = z.infer<typeof costBandSchema>;
export type IndoorOutdoor = z.infer<typeof indoorOutdoorSchema>;
export type OpeningStatus = z.infer<typeof openingStatusSchema>;
export type EvidenceTier = z.infer<typeof evidenceTierSchema>;
export type TravelMode = z.infer<typeof travelModeSchema>;
export type RouteMethod = z.infer<typeof routeMethodSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type ReasonCode = z.infer<typeof reasonCodeSchema>;
export type WarningCode = z.infer<typeof warningCodeSchema>;
