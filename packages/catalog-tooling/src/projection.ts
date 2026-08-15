import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import {
  algorithmConstants,
  cityIdSchema,
  publishedEvidenceSchema,
  publishedPlaceSchema,
} from "@route-composer/contracts";
import { z } from "zod";

import {
  evidenceRecordSchema,
  placeSeedSchema,
  routeMatrixSchema,
  SeedValidationError,
  sourceRecordSchema,
  validateSeedDirectory,
} from "./seed.js";

export type ProjectionBuildOptions = {
  readonly catalogVersion: string;
  readonly generatedAt: string;
  readonly reviewedBy: string;
  readonly releaseNotes: string;
  readonly production: boolean;
  readonly asOf?: string;
};

export type CatalogProjection = {
  readonly metadata: {
    readonly version: string;
    readonly generatedAt: string;
    readonly sourceChecksum: string;
    readonly schemaVersion: string;
    readonly cityStats: Readonly<Record<"TOKYO" | "SEOUL", CityStats>>;
    readonly reviewedBy: string;
    readonly releaseNotes: string;
  };
  readonly places: readonly z.infer<typeof publishedPlaceSchema>[];
  readonly evidence: readonly z.infer<typeof publishedEvidenceSchema>[];
  readonly routes: readonly z.infer<typeof routeMatrixSchema>[];
};

export type CityStats = {
  readonly placeCount: number;
  readonly publishedPlaceCount: number;
  readonly evidenceCount: number;
};

export type ProjectionBuildResult = {
  readonly checksum: string;
  readonly sourceChecksum: string;
  readonly canonicalJson: string;
  readonly projection: CatalogProjection;
};

export type ProjectionArtifact = Pick<
  ProjectionBuildResult,
  "checksum" | "sourceChecksum" | "projection"
>;

function jsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(directory, entry.name))
    .sort();
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
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

function readValidatedRecords(root: string): {
  readonly sources: readonly z.infer<typeof sourceRecordSchema>[];
  readonly places: readonly z.infer<typeof placeSeedSchema>[];
  readonly evidence: readonly z.infer<typeof evidenceRecordSchema>[];
  readonly routes: readonly z.infer<typeof routeMatrixSchema>[];
} {
  const sources = jsonFiles(join(root, "sources")).map((file) =>
    readJson<z.infer<typeof sourceRecordSchema>>(file),
  );
  const evidence = ["tokyo", "seoul"].flatMap((city) =>
    jsonFiles(join(root, "evidence", city)).map((file) =>
      readJson<z.infer<typeof evidenceRecordSchema>>(file),
    ),
  );
  const places = ["tokyo", "seoul"].flatMap((city) =>
    jsonFiles(join(root, "catalog", city)).map((file) =>
      readJson<z.infer<typeof placeSeedSchema>>(file),
    ),
  );
  const routes = ["tokyo", "seoul"].map((city) =>
    readJson<z.infer<typeof routeMatrixSchema>>(join(root, "routes", `${city}.json`)),
  );
  return { sources, places, evidence, routes };
}

function publicEvidenceRecords(
  records: readonly z.infer<typeof evidenceRecordSchema>[],
  sources: readonly z.infer<typeof sourceRecordSchema>[],
): Map<string, z.infer<typeof publishedEvidenceSchema>> {
  const sourcesById = new Map(sources.map((source) => [source.sourceId, source]));
  return new Map(
    records
      .filter(
        (record) =>
          record.publicationStatus === "APPROVED" &&
          (record.evidenceTier === "A_OFFICIAL_OPEN" ||
            record.evidenceTier === "B_LICENSED_EDITORIAL"),
      )
      .map((record) => {
        const source = sourcesById.get(record.sourceId);
        if (source === undefined) {
          throw new Error(`Validated evidence ${record.evidenceId} has no Source.`);
        }
        const evidence = publishedEvidenceSchema.parse({
          evidenceId: record.evidenceId,
          tier: record.evidenceTier,
          active: true,
          providerName: source.providerName,
          supportedClaims: record.supportedClaims,
          checkedAt: record.checkedAt,
          url: record.sourceUrl,
          attribution: source.attributionTemplate,
        });
        return [record.evidenceId, evidence] as const;
      }),
  );
}

function publicPlaceRecords(
  places: readonly z.infer<typeof placeSeedSchema>[],
  evidenceById: ReadonlyMap<string, z.infer<typeof publishedEvidenceSchema>>,
): z.infer<typeof publishedPlaceSchema>[] {
  return places
    .filter((place) => place.publicationStatus === "PUBLISHED")
    .map((place) => {
      const evidence = place.evidenceRefs
        .map((evidenceId) => evidenceById.get(evidenceId))
        .filter((value): value is z.infer<typeof publishedEvidenceSchema> => value !== undefined);
      return publishedPlaceSchema.parse({
        placeId: place.placeId,
        cityId: place.cityId,
        zoneId: place.zoneId,
        names: place.names,
        category: place.category,
        latitude: place.coordinates.latitude,
        longitude: place.coordinates.longitude,
        costBand: place.costBand,
        indoorOutdoor: place.indoorOutdoor,
        themeTags: place.themeTags,
        companionFit: place.companionFit,
        typicalDurationMinutes: place.typicalDurationMinutes,
        openingStatus: place.openingSchedule.status,
        officialUrl: place.officialUrl,
        published: true,
        evidence,
      });
    });
}

function cityStats(
  city: z.infer<typeof cityIdSchema>,
  places: readonly z.infer<typeof placeSeedSchema>[],
  evidence: readonly z.infer<typeof evidenceRecordSchema>[],
): CityStats {
  const cityPlaces = places.filter((place) => place.cityId === city);
  const placeIds = new Set(cityPlaces.map((place) => place.placeId));
  return {
    placeCount: cityPlaces.length,
    publishedPlaceCount: cityPlaces.filter((place) => place.publicationStatus === "PUBLISHED")
      .length,
    evidenceCount: evidence.filter((record) => placeIds.has(record.placeId)).length,
  };
}

export function buildProjection(
  rootDirectory: string,
  options: ProjectionBuildOptions,
): ProjectionBuildResult {
  const root = resolve(rootDirectory);
  const validation = validateSeedDirectory(root, {
    production: options.production,
    ...(options.asOf === undefined ? {} : { asOf: options.asOf }),
  });
  const records = readValidatedRecords(root);
  const evidenceById = publicEvidenceRecords(records.evidence, records.sources);
  const places = publicPlaceRecords(records.places, evidenceById);
  const evidenceIds = new Set(
    places.flatMap((place) => place.evidence.map((evidence) => evidence.evidenceId)),
  );
  const projection: CatalogProjection = {
    metadata: {
      version: options.catalogVersion,
      generatedAt: options.generatedAt,
      sourceChecksum: validation.checksum,
      schemaVersion: algorithmConstants.schemaVersion,
      cityStats: {
        TOKYO: cityStats("TOKYO", records.places, records.evidence),
        SEOUL: cityStats("SEOUL", records.places, records.evidence),
      },
      reviewedBy: options.reviewedBy,
      releaseNotes: options.releaseNotes,
    },
    places,
    evidence: [...evidenceById.values()].filter((evidence) => evidenceIds.has(evidence.evidenceId)),
    routes: records.routes,
  };
  const canonicalJson = JSON.stringify(canonicalize(projection));
  return {
    checksum: createHash("sha256").update(canonicalJson).digest("hex"),
    sourceChecksum: validation.checksum,
    canonicalJson,
    projection,
  };
}

export function serializeProjectionArtifact(result: ProjectionBuildResult): string {
  const artifact: ProjectionArtifact = {
    checksum: result.checksum,
    sourceChecksum: result.sourceChecksum,
    projection: result.projection,
  };
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function writeProjectionArtifact(outputFile: string, result: ProjectionBuildResult): void {
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, serializeProjectionArtifact(result), "utf8");
}

export { SeedValidationError };
