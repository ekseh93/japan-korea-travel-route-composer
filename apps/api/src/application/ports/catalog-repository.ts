import type { CityId } from "@route-composer/contracts";

import type { PlaceProfile } from "../../domain/trip-plan.js";

export type CatalogVersion = {
  readonly cityId: CityId;
  readonly version: string;
  readonly schemaVersion: string;
  readonly sourceChecksum: string;
  readonly placeCount: number;
  readonly checkedAt: string;
};

export interface CatalogRepository {
  getCurrentVersion(cityId: CityId): Promise<CatalogVersion | null>;
  getPublishedPlaces(cityId: CityId, version: string): Promise<readonly PlaceProfile[]>;
}
