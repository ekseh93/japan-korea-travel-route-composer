import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import {
  cityIdSchema,
  claimTypeSchema,
  confidenceSchema,
  costBandSchema,
  evidencePublicationStatusSchema,
  evidenceTierSchema,
  indoorOutdoorSchema,
  placeCategorySchema,
  placePublicationStatusSchema,
  sourceReviewStatusSchema,
  themeTagSchema,
  travelModeSchema,
  zoneIdSchema,
} from "@route-composer/contracts";
import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sourceCollectionModeSchema = z.enum(["API", "DATASET_DOWNLOAD", "MANUAL_LINK", "NONE"]);
const localizedTextSchema = z
  .object({
    ko: z.string().min(1).optional(),
    ja: z.string().min(1).optional(),
    en: z.string().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((text) => text !== undefined));
const urlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"));
const openingWindowSchema = z
  .object({
    opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict();
const openingScheduleSchema = z
  .object({
    status: z.enum(["VERIFIED", "OPEN_SPACE", "UNKNOWN"]),
    timezone: z.enum(["Asia/Tokyo", "Asia/Seoul"]),
    weekly: z.record(z.string(), z.array(openingWindowSchema)),
    exceptions: z.array(
      z
        .object({
          date: isoDateSchema,
          closed: z.boolean(),
          windows: z.array(openingWindowSchema),
        })
        .strict(),
    ),
    checkedAt: isoDateSchema,
  })
  .strict();

export const sourceRecordSchema = z
  .object({
    sourceId: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)+$/),
    providerName: z.string().min(1),
    baseUrl: urlSchema,
    termsUrl: urlSchema.nullable(),
    robotsUrl: urlSchema.nullable(),
    licenseId: z.string().min(1).nullable(),
    collectionMode: sourceCollectionModeSchema,
    allowedFields: z.array(claimTypeSchema).min(1),
    forbiddenFields: z.array(z.string().min(1)).min(1),
    attributionTemplate: z.string().min(1),
    reviewStatus: sourceReviewStatusSchema,
    checkedAt: isoDateSchema,
    nextReviewAt: isoDateSchema,
    removalContact: urlSchema,
    reviewNotes: z.string().min(1),
  })
  .strict();

export const evidenceRecordSchema = z
  .object({
    evidenceId: z.string().regex(/^ev_[a-z0-9]+(?:_[a-z0-9]+)+$/),
    sourceId: z.string(),
    placeId: z.string().regex(/^pl_[a-z0-9]+(?:_[a-z0-9]+)+$/),
    evidenceTier: evidenceTierSchema,
    supportedClaims: z.array(claimTypeSchema).min(1),
    sourceUrl: urlSchema,
    sourceTitle: z.string().min(1),
    rightsBasis: z.string().min(1),
    checkedAt: isoDateSchema,
    reviewDueAt: isoDateSchema,
    editorialSummary: localizedTextSchema,
    publicationStatus: evidencePublicationStatusSchema,
  })
  .strict();

export const placeSeedSchema = z
  .object({
    placeId: z.string().regex(/^pl_[a-z0-9]+(?:_[a-z0-9]+)+$/),
    cityId: cityIdSchema,
    zoneId: zoneIdSchema,
    names: localizedTextSchema,
    coordinates: z
      .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
      .strict(),
    category: placeCategorySchema,
    themeTags: z.array(themeTagSchema).min(1).max(5),
    companionFit: z.array(z.enum(["SOLO", "FRIEND", "COUPLE", "FAMILY"])).min(1),
    costBand: costBandSchema,
    indoorOutdoor: indoorOutdoorSchema,
    typicalDurationMinutes: z.number().int().min(15).max(360),
    openingSchedule: openingScheduleSchema,
    accessibility: z.array(z.string().min(1)),
    evidenceRefs: z.array(z.string()).min(1),
    reviewPointers: z.array(z.string()),
    officialUrl: urlSchema.nullable(),
    editorialSummary: localizedTextSchema,
    publicationStatus: placePublicationStatusSchema,
    checkedAt: isoDateSchema,
  })
  .strict();

export const routeMatrixSchema = z
  .object({
    cityId: cityIdSchema,
    routeMatrixVersion: z.string().min(1),
    checkedAt: isoDateSchema,
    methodology: z.string().min(1),
    sourceRefs: z.array(z.string()),
    zones: z.array(zoneIdSchema).min(1),
    routes: z.array(
      z
        .object({
          originZoneId: zoneIdSchema,
          destinationZoneId: zoneIdSchema,
          mode: travelModeSchema,
          durationMinutes: z.number().int().positive(),
          confidence: confidenceSchema,
        })
        .strict(),
    ),
  })
  .strict();

export type ValidationIssue = {
  readonly code: string;
  readonly file: string;
  readonly message: string;
};

export type ValidationReport = {
  readonly checksum: string;
  readonly sourceCount: number;
  readonly evidenceCount: number;
  readonly placeCount: number;
  readonly routeCount: number;
};

export type SeedValidationOptions = {
  readonly production: boolean;
  readonly asOf?: string;
};

export class SeedValidationError extends Error {
  public readonly issues: readonly ValidationIssue[];

  public constructor(issues: readonly ValidationIssue[]) {
    super(`Seed validation failed with ${issues.length} issue(s).`);
    this.name = "SeedValidationError";
    this.issues = issues;
  }
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8")) as unknown;
}

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(directory, entry.name))
    .sort();
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function hasForbiddenContent(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return /"(?:reviewText|userName|userProfile|photoBinary|ratingAggregate|htmlSnapshot|searchSnippet)"\s*:|<\/?[a-z][^>]*>|[A-Za-z0-9+/]{80,}={0,2}/i.test(
    serialized,
  );
}

function checkFileId(file: string, expectedId: string, issues: ValidationIssue[]): void {
  if (
    file
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.json$/, "") !== expectedId
  ) {
    issues.push({
      code: "*_FILE_NAME_MISMATCH",
      file,
      message: `Expected file name for ${expectedId}.`,
    });
  }
}

function parseWithSchema<T>(
  schema: z.ZodType<T>,
  value: unknown,
  file: string,
  issues: ValidationIssue[],
): T | undefined {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    issues.push({
      code: "SCHEMA_INVALID",
      file,
      message: parsed.error.issues.map((issue) => issue.message).join("; "),
    });
    return undefined;
  }
  return parsed.data;
}

function validateDateOrder(
  earlier: string,
  later: string,
  file: string,
  issues: ValidationIssue[],
): void {
  if (later <= earlier)
    issues.push({
      code: "INVALID_DATE_ORDER",
      file,
      message: `${later} must be after ${earlier}.`,
    });
}

export function validateSeedDirectory(
  rootDirectory: string,
  options: SeedValidationOptions,
): ValidationReport {
  const root = resolve(rootDirectory);
  const issues: ValidationIssue[] = [];
  const asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
  const values: unknown[] = [];
  const sourceById = new Map<string, z.infer<typeof sourceRecordSchema>>();
  const evidenceById = new Map<string, z.infer<typeof evidenceRecordSchema>>();
  const places: z.infer<typeof placeSeedSchema>[] = [];
  let routeCount = 0;

  for (const file of filesIn(join(root, "sources"))) {
    const source = parseWithSchema(
      sourceRecordSchema,
      readJson(file),
      relative(root, file),
      issues,
    );
    if (source === undefined) continue;
    checkFileId(file, source.sourceId, issues);
    validateDateOrder(source.checkedAt, source.nextReviewAt, relative(root, file), issues);
    if (source.nextReviewAt <= asOf) {
      issues.push({
        code: "SOURCE_REVIEW_EXPIRED",
        file: relative(root, file),
        message: `Source nextReviewAt ${source.nextReviewAt} is not after ${asOf}.`,
      });
    }
    if (
      options.production &&
      (source.licenseId === "TEST_FIXTURE_ONLY" || source.baseUrl.includes("example.com"))
    ) {
      issues.push({
        code: "FIXTURE_IN_PRODUCTION",
        file: relative(root, file),
        message: "Synthetic source cannot enter production projection.",
      });
    }
    sourceById.set(source.sourceId, source);
    values.push(source);
  }

  for (const city of ["tokyo", "seoul"]) {
    for (const file of filesIn(join(root, "evidence", city))) {
      const evidence = parseWithSchema(
        evidenceRecordSchema,
        readJson(file),
        relative(root, file),
        issues,
      );
      if (evidence === undefined) continue;
      checkFileId(file, evidence.evidenceId, issues);
      validateDateOrder(evidence.checkedAt, evidence.reviewDueAt, relative(root, file), issues);
      const source = sourceById.get(evidence.sourceId);
      if (source === undefined) {
        issues.push({
          code: "UNKNOWN_SOURCE",
          file: relative(root, file),
          message: `Unknown Source ${evidence.sourceId}.`,
        });
      } else {
        if (new URL(evidence.sourceUrl).hostname !== new URL(source.baseUrl).hostname) {
          issues.push({
            code: "SOURCE_HOST_MISMATCH",
            file: relative(root, file),
            message: `Evidence URL host is not registered for Source ${source.sourceId}.`,
          });
        }
        if (!source.allowedFields.some((field) => evidence.supportedClaims.includes(field))) {
          issues.push({
            code: "CLAIM_NOT_ALLOWED",
            file: relative(root, file),
            message: "Evidence claims do not overlap Source allowed fields.",
          });
        }
        if (source.reviewStatus === "BLOCKED" || source.reviewStatus === "UNVERIFIED") {
          issues.push({
            code: "BLOCKED_SOURCE_REFERENCE",
            file: relative(root, file),
            message: `Evidence references ${source.reviewStatus} Source ${source.sourceId}.`,
          });
        }
        if (
          evidence.publicationStatus === "APPROVED" &&
          source.reviewStatus === "MANUAL_LINK_ONLY" &&
          (evidence.evidenceTier !== "C_COMMUNITY_POINTER" ||
            evidence.rightsBasis !== "MANUAL_LINK_ONLY")
        ) {
          issues.push({
            code: "MANUAL_LINK_PUBLICATION_INVALID",
            file: relative(root, file),
            message:
              "MANUAL_LINK_ONLY Source requires a C_COMMUNITY_POINTER and MANUAL_LINK_ONLY rights basis.",
          });
        }
        if (
          evidence.evidenceTier === "C_COMMUNITY_POINTER" &&
          (source.reviewStatus !== "MANUAL_LINK_ONLY" ||
            evidence.rightsBasis !== "MANUAL_LINK_ONLY")
        ) {
          issues.push({
            code: "COMMUNITY_POINTER_SOURCE_INVALID",
            file: relative(root, file),
            message: "C_COMMUNITY_POINTER requires MANUAL_LINK_ONLY Source and rights basis.",
          });
        }
      }
      if (evidence.publicationStatus === "APPROVED" && evidence.reviewDueAt <= asOf) {
        issues.push({
          code: "EVIDENCE_REVIEW_EXPIRED",
          file: relative(root, file),
          message: `Evidence reviewDueAt ${evidence.reviewDueAt} is not after ${asOf}.`,
        });
      }
      if (
        options.production &&
        (evidence.rightsBasis === "TEST_FIXTURE_ONLY" || evidence.sourceUrl.includes("example.com"))
      ) {
        issues.push({
          code: "FIXTURE_IN_PRODUCTION",
          file: relative(root, file),
          message: "Synthetic evidence cannot enter production projection.",
        });
      }
      if (hasForbiddenContent(evidence)) {
        issues.push({
          code: "FORBIDDEN_CONTENT_DETECTED",
          file: relative(root, file),
          message: "Forbidden content detected.",
        });
      }
      evidenceById.set(evidence.evidenceId, evidence);
      values.push(evidence);
    }
  }

  for (const city of ["tokyo", "seoul"]) {
    for (const file of filesIn(join(root, "catalog", city))) {
      const place = parseWithSchema(placeSeedSchema, readJson(file), relative(root, file), issues);
      if (place === undefined) continue;
      checkFileId(file, place.placeId, issues);
      if (place.publicationStatus === "PUBLISHED") {
        const activeEvidence = place.evidenceRefs
          .map((evidenceId) => evidenceById.get(evidenceId))
          .filter(
            (evidence): evidence is z.infer<typeof evidenceRecordSchema> =>
              evidence !== undefined && evidence.publicationStatus === "APPROVED",
          );
        if (
          !activeEvidence.some(
            (evidence) =>
              evidence.evidenceTier === "A_OFFICIAL_OPEN" ||
              evidence.evidenceTier === "B_LICENSED_EDITORIAL",
          )
        ) {
          issues.push({
            code: "MISSING_TIER_AB_EVIDENCE",
            file: relative(root, file),
            message: "PUBLISHED Place requires active Tier A/B Evidence.",
          });
        }
      }
      if (hasForbiddenContent(place))
        issues.push({
          code: "FORBIDDEN_CONTENT_DETECTED",
          file: relative(root, file),
          message: "Forbidden content detected.",
        });
      if (
        options.production &&
        (place.editorialSummary.ko?.includes("합성") ||
          place.editorialSummary.en?.toLowerCase().includes("synthetic"))
      ) {
        issues.push({
          code: "FIXTURE_IN_PRODUCTION",
          file: relative(root, file),
          message: "Synthetic Place cannot enter production projection.",
        });
      }
      places.push(place);
      values.push(place);
    }
  }

  for (const city of ["tokyo", "seoul"]) {
    const file = join(root, "routes", `${city}.json`);
    const matrix = parseWithSchema(routeMatrixSchema, readJson(file), relative(root, file), issues);
    if (matrix === undefined) continue;
    routeCount += matrix.routes.length;
    if (options.production && matrix.sourceRefs.length === 0) {
      issues.push({
        code: "ROUTE_SOURCE_REQUIRED",
        file: relative(root, file),
        message: "Production route matrix requires at least one SourceRef.",
      });
    }
    for (const sourceRef of matrix.sourceRefs) {
      const source = sourceById.get(sourceRef);
      if (source === undefined) {
        issues.push({
          code: "UNKNOWN_SOURCE",
          file: relative(root, file),
          message: `Unknown route Source ${sourceRef}.`,
        });
      } else if (source.reviewStatus === "BLOCKED" || source.reviewStatus === "UNVERIFIED") {
        issues.push({
          code: "BLOCKED_SOURCE_REFERENCE",
          file: relative(root, file),
          message: `Route matrix references ${source.reviewStatus} Source ${source.sourceId}.`,
        });
      }
    }
    if (options.production && matrix.methodology === "SYNTHETIC_TEST_ONLY") {
      issues.push({
        code: "FIXTURE_IN_PRODUCTION",
        file: relative(root, file),
        message: "Synthetic route matrix cannot enter production projection.",
      });
    }
    const pairs = new Set<string>();
    for (const route of matrix.routes) {
      const pair = `${route.originZoneId}->${route.destinationZoneId}`;
      if (
        route.originZoneId === route.destinationZoneId ||
        pairs.has(pair) ||
        route.durationMinutes % 5 !== 0
      ) {
        issues.push({
          code: "ROUTE_MATRIX_INVALID",
          file: relative(root, file),
          message: `Invalid or duplicate route ${pair}.`,
        });
      }
      pairs.add(pair);
    }
    for (const origin of matrix.zones) {
      for (const destination of matrix.zones) {
        if (origin !== destination && !pairs.has(`${origin}->${destination}`)) {
          issues.push({
            code: "ROUTE_MATRIX_INCOMPLETE",
            file: relative(root, file),
            message: `Missing route ${origin}->${destination}.`,
          });
        }
      }
    }
    values.push(matrix);
  }

  if (issues.length > 0) throw new SeedValidationError(issues);
  return {
    checksum: createHash("sha256")
      .update(JSON.stringify(canonicalize(values)))
      .digest("hex"),
    sourceCount: sourceById.size,
    evidenceCount: evidenceById.size,
    placeCount: places.length,
    routeCount,
  };
}
