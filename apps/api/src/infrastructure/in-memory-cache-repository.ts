import type {
  CachedItinerary,
  ItineraryCacheRepository,
} from "../application/ports/cache-repository.js";

export class InMemoryItineraryCacheRepository implements ItineraryCacheRepository {
  private readonly entries = new Map<string, CachedItinerary>();
  private readonly clock: () => number;

  public constructor(clock: () => number = () => Math.floor(Date.now() / 1000)) {
    this.clock = clock;
  }

  public async get(
    cacheKey: string,
    nowEpochSeconds = this.clock(),
  ): Promise<CachedItinerary | null> {
    const entry = this.entries.get(cacheKey);
    if (entry === undefined) return null;
    if (entry.expiresAtEpochSeconds <= nowEpochSeconds) {
      this.entries.delete(cacheKey);
      return null;
    }
    return entry;
  }

  public async put(
    cacheKey: string,
    plan: Omit<CachedItinerary, "expiresAtEpochSeconds">,
    ttlSeconds: number,
  ): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new RangeError("Cache TTL must be a positive integer.");
    }
    this.entries.set(cacheKey, {
      ...plan,
      expiresAtEpochSeconds: this.clock() + ttlSeconds,
    });
  }
}
