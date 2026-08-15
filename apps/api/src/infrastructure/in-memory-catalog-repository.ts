import type { CityId } from "@route-composer/contracts";

import type { CatalogRepository, CatalogVersion } from "../application/ports/catalog-repository.js";
import type { PlaceProfile } from "../domain/trip-plan.js";

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly version: CatalogVersion;
  private readonly places: readonly PlaceProfile[];

  public constructor(version: CatalogVersion, places: readonly PlaceProfile[]) {
    this.version = version;
    this.places = places.map((place) => ({ ...place, evidence: [...place.evidence] }));
  }

  public async getCurrentVersion(cityId: CityId): Promise<CatalogVersion | null> {
    return this.version.cityId === cityId ? this.version : null;
  }

  public async getPublishedPlaces(
    cityId: CityId,
    version: string,
  ): Promise<readonly PlaceProfile[]> {
    if (this.version.cityId !== cityId || this.version.version !== version) return [];
    return this.places.map((place) => ({ ...place, evidence: [...place.evidence] }));
  }
}
