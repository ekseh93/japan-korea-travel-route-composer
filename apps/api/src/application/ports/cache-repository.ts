import type { ComposeTripResponse } from "@route-composer/contracts";

export type CachedItinerary = {
  readonly catalogVersion: string;
  readonly plan: ComposeTripResponse;
  readonly expiresAtEpochSeconds: number;
};

export interface ItineraryCacheRepository {
  get(cacheKey: string, nowEpochSeconds?: number): Promise<CachedItinerary | null>;
  put(
    cacheKey: string,
    plan: Omit<CachedItinerary, "expiresAtEpochSeconds">,
    ttlSeconds: number,
  ): Promise<void>;
}
