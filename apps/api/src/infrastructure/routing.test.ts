import { describe, expect, it } from "vitest";

import type { RoutePoint, RoutingRepository } from "../application/ports/routing-repository.js";
import { GeoPoint } from "../domain/value-objects.js";
import {
  CuratedRoutingRepository,
  FallbackRoutingRepository,
  type ZoneMatrixRecord,
} from "./curated-routing-repository.js";
import { RoutingRepositoryError } from "./routing-errors.js";

const matrix: readonly ZoneMatrixRecord[] = [
  {
    originZoneId: "TOKYO_SHIBUYA_HARAJUKU",
    destinationZoneId: "TOKYO_SHINJUKU",
    mode: "TRANSIT_ESTIMATE",
    durationMinutes: 20,
    confidence: "LOW",
    checkedAt: "2026-08-15",
  },
];

function point(
  placeId: string,
  zoneId: RoutePoint["zoneId"],
  latitude = 35.66,
  longitude = 139.7,
): RoutePoint {
  return {
    placeId,
    cityId: "TOKYO",
    zoneId,
    coordinates: GeoPoint.create(latitude, longitude),
  };
}

function baseRouting(): CuratedRoutingRepository {
  return new CuratedRoutingRepository(matrix, {
    sameZoneBufferMinutes: 5,
    haversineCheckedAt: "2026-08-15",
  });
}

describe("curated routing repository", () => {
  it("uses Haversine for same-zone walking and rounds conservatively", async () => {
    const estimate = await baseRouting().estimate(
      point("pl_origin", "TOKYO_SHIBUYA_HARAJUKU"),
      point("pl_destination", "TOKYO_SHIBUYA_HARAJUKU", 35.67, 139.7),
    );

    expect(estimate.method).toBe("HAVERSINE");
    expect(estimate.mode).toBe("WALK");
    expect(estimate.confidence).toBe("MEDIUM");
    expect(estimate.distanceMeters).toBeGreaterThan(1_000);
    expect(estimate.durationMinutes % 5).toBe(0);
    expect(estimate.fallbackUsed).toBe(false);
  });

  it("uses the directional curated matrix for cross-zone travel", async () => {
    const estimate = await baseRouting().estimate(
      point("pl_origin", "TOKYO_SHIBUYA_HARAJUKU"),
      point("pl_destination", "TOKYO_SHINJUKU"),
    );

    expect(estimate).toMatchObject({
      durationMinutes: 20,
      method: "CURATED_ZONE_MATRIX",
      confidence: "LOW",
      distanceMeters: null,
      checkedAt: "2026-08-15",
    });
  });

  it("rejects missing cross-zone routes instead of inventing transit time", async () => {
    await expect(
      baseRouting().estimate(
        point("pl_origin", "TOKYO_SHINJUKU"),
        point("pl_destination", "TOKYO_GINZA_MARUNOUCHI"),
      ),
    ).rejects.toMatchObject({
      name: "RoutingRepositoryError",
      details: [{ code: "ROUTE_MISSING" }],
    });
  });

  it("rejects duplicate and cross-city matrix records", () => {
    expect(
      () =>
        new CuratedRoutingRepository([...matrix, ...matrix], {
          sameZoneBufferMinutes: 5,
          haversineCheckedAt: "2026-08-15",
        }),
    ).toThrow(RoutingRepositoryError);
    expect(
      () =>
        new CuratedRoutingRepository(
          [
            {
              ...matrix[0]!,
              destinationZoneId: "SEOUL_GANGNAM",
            },
          ],
          {
            sameZoneBufferMinutes: 5,
            haversineCheckedAt: "2026-08-15",
          },
        ),
    ).toThrow(RoutingRepositoryError);
  });
});

describe("routing fallback", () => {
  it("uses the baseline adapter after a primary failure and marks the result", async () => {
    const primary: RoutingRepository = {
      estimate: async () => {
        throw new Error("provider unavailable");
      },
    };
    const repository = new FallbackRoutingRepository(primary, baseRouting());
    const estimate = await repository.estimate(
      point("pl_origin", "TOKYO_SHIBUYA_HARAJUKU"),
      point("pl_destination", "TOKYO_SHIBUYA_HARAJUKU", 35.67, 139.7),
    );

    expect(estimate).toMatchObject({ method: "HAVERSINE", fallbackUsed: true });
  });

  it("returns a stable repository error when both adapters fail", async () => {
    const failing: RoutingRepository = {
      estimate: async () => {
        throw new Error("unavailable");
      },
    };
    const repository = new FallbackRoutingRepository(failing, failing);

    await expect(
      repository.estimate(
        point("pl_origin", "TOKYO_SHIBUYA_HARAJUKU"),
        point("pl_destination", "TOKYO_SHINJUKU"),
      ),
    ).rejects.toBeInstanceOf(RoutingRepositoryError);
  });
});
