import type { CityId } from "@route-composer/contracts";

import type { ProjectionBuildResult } from "./projection.js";

const cityIds = ["TOKYO", "SEOUL"] as const satisfies readonly CityId[];
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export type CatalogCurrentPointer = {
  readonly cityId: CityId;
  readonly version: string;
  readonly schemaVersion: string;
  readonly sourceChecksum: string;
  readonly placeCount: number;
  readonly checkedAt: string;
};

export class CurrentPointerConflictError extends Error {
  public constructor(cityId: CityId, expectedVersion: string | null, actualVersion: string | null) {
    super(
      `Current pointer conflict for ${cityId}: expected ${expectedVersion ?? "<empty>"}, found ${actualVersion ?? "<empty>"}.`,
    );
    this.name = "CurrentPointerConflictError";
  }
}

export function prepareCurrentPointers(
  result: ProjectionBuildResult,
  checkedAt: string,
): readonly CatalogCurrentPointer[] {
  if (!isoDatePattern.test(checkedAt)) {
    throw new RangeError("checkedAt must use YYYY-MM-DD format.");
  }

  return cityIds.map((cityId) => {
    const cityPlaces = result.projection.places.filter((place) => place.cityId === cityId);
    const expectedPublishedCount = result.projection.metadata.cityStats[cityId].publishedPlaceCount;
    if (cityPlaces.length !== expectedPublishedCount) {
      throw new Error(`Projection published Place count does not match metadata for ${cityId}.`);
    }
    if (cityPlaces.some((place) => place.published !== true)) {
      throw new Error(`Projection contains an unpublished Place for ${cityId}.`);
    }
    return {
      cityId,
      version: result.projection.metadata.version,
      schemaVersion: result.projection.metadata.schemaVersion,
      sourceChecksum: result.sourceChecksum,
      placeCount: cityPlaces.length,
      checkedAt,
    };
  });
}

export function promoteCurrentPointer(
  current: CatalogCurrentPointer | null,
  next: CatalogCurrentPointer,
  expectedPreviousVersion: string | null,
): CatalogCurrentPointer {
  const actualVersion = current?.version ?? null;
  if (actualVersion !== expectedPreviousVersion) {
    throw new CurrentPointerConflictError(next.cityId, expectedPreviousVersion, actualVersion);
  }
  return next;
}
