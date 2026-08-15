import type { Confidence, TravelMode, ZoneId } from "@route-composer/contracts";

import type {
  RouteEstimate,
  RoutePoint,
  RoutingRepository,
} from "../application/ports/routing-repository.js";
import { RoutingRepositoryError } from "./routing-errors.js";

export type ZoneMatrixRecord = {
  readonly originZoneId: ZoneId;
  readonly destinationZoneId: ZoneId;
  readonly mode: TravelMode;
  readonly durationMinutes: number;
  readonly confidence: Confidence;
  readonly checkedAt: string;
};

export type CuratedRoutingOptions = {
  readonly sameZoneBufferMinutes: number;
  readonly haversineCheckedAt: string;
  readonly walkSpeedMetersPerMinute?: number;
  readonly walkRoundingMinutes?: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function cityPrefix(zoneId: ZoneId): "TOKYO" | "SEOUL" {
  return zoneId.startsWith("TOKYO_") ? "TOKYO" : "SEOUL";
}

function pairKey(originZoneId: ZoneId, destinationZoneId: ZoneId): string {
  return `${originZoneId}->${destinationZoneId}`;
}

function haversineDistanceMeters(
  origin: RoutePoint["coordinates"],
  destination: RoutePoint["coordinates"],
): number {
  const latitudeDelta = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const longitudeDelta = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const originLatitude = (origin.latitude * Math.PI) / 180;
  const destinationLatitude = (destination.latitude * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function roundUp(value: number, unit: number): number {
  return Math.max(unit, Math.ceil(value / unit) * unit);
}

export class CuratedRoutingRepository implements RoutingRepository {
  private readonly matrix = new Map<string, ZoneMatrixRecord>();
  private readonly options: Required<CuratedRoutingOptions>;

  public constructor(records: readonly ZoneMatrixRecord[], options: CuratedRoutingOptions) {
    if (!Number.isInteger(options.sameZoneBufferMinutes) || options.sameZoneBufferMinutes < 0) {
      throw new RangeError("sameZoneBufferMinutes must be a non-negative integer.");
    }
    if (
      !Number.isInteger(options.walkSpeedMetersPerMinute ?? 75) ||
      (options.walkSpeedMetersPerMinute ?? 75) <= 0
    ) {
      throw new RangeError("walkSpeedMetersPerMinute must be a positive integer.");
    }
    if (
      !Number.isInteger(options.walkRoundingMinutes ?? 5) ||
      (options.walkRoundingMinutes ?? 5) <= 0
    ) {
      throw new RangeError("walkRoundingMinutes must be a positive integer.");
    }
    this.options = {
      sameZoneBufferMinutes: options.sameZoneBufferMinutes,
      haversineCheckedAt: options.haversineCheckedAt,
      walkSpeedMetersPerMinute: options.walkSpeedMetersPerMinute ?? 75,
      walkRoundingMinutes: options.walkRoundingMinutes ?? 5,
    };
    for (const record of records) {
      if (
        record.originZoneId === record.destinationZoneId ||
        record.durationMinutes <= 0 ||
        record.durationMinutes % 5 !== 0 ||
        this.matrix.has(pairKey(record.originZoneId, record.destinationZoneId))
      ) {
        throw new RoutingRepositoryError(
          `Invalid or duplicate route ${pairKey(record.originZoneId, record.destinationZoneId)}.`,
        );
      }
      if (cityPrefix(record.originZoneId) !== cityPrefix(record.destinationZoneId)) {
        throw new RoutingRepositoryError("A route cannot connect two cities.");
      }
      this.matrix.set(pairKey(record.originZoneId, record.destinationZoneId), record);
    }
  }

  public async estimate(origin: RoutePoint, destination: RoutePoint): Promise<RouteEstimate> {
    if (origin.cityId !== destination.cityId) {
      throw new RoutingRepositoryError("A route cannot connect two cities.");
    }
    if (origin.zoneId === destination.zoneId) {
      const distanceMeters = haversineDistanceMeters(origin.coordinates, destination.coordinates);
      const walkingMinutes = roundUp(
        distanceMeters / this.options.walkSpeedMetersPerMinute + this.options.sameZoneBufferMinutes,
        this.options.walkRoundingMinutes,
      );
      return {
        originPlaceId: origin.placeId,
        destinationPlaceId: destination.placeId,
        originZoneId: origin.zoneId,
        destinationZoneId: destination.zoneId,
        mode: "WALK",
        durationMinutes: walkingMinutes,
        distanceMeters,
        confidence: "MEDIUM",
        method: "HAVERSINE",
        checkedAt: this.options.haversineCheckedAt,
        fallbackUsed: false,
      };
    }

    const record = this.matrix.get(pairKey(origin.zoneId, destination.zoneId));
    if (record === undefined) {
      throw new RoutingRepositoryError("Curated route matrix is incomplete.", [
        {
          code: "ROUTE_MISSING",
          message: `No route exists for ${origin.zoneId} to ${destination.zoneId}.`,
        },
      ]);
    }
    return {
      originPlaceId: origin.placeId,
      destinationPlaceId: destination.placeId,
      originZoneId: origin.zoneId,
      destinationZoneId: destination.zoneId,
      mode: record.mode,
      durationMinutes: record.durationMinutes,
      distanceMeters: null,
      confidence: record.confidence,
      method: "CURATED_ZONE_MATRIX",
      checkedAt: record.checkedAt,
      fallbackUsed: false,
    };
  }
}

export class FallbackRoutingRepository implements RoutingRepository {
  private readonly primary: RoutingRepository;
  private readonly fallback: RoutingRepository;

  public constructor(primary: RoutingRepository, fallback: RoutingRepository) {
    this.primary = primary;
    this.fallback = fallback;
  }

  public async estimate(origin: RoutePoint, destination: RoutePoint): Promise<RouteEstimate> {
    try {
      return await this.primary.estimate(origin, destination);
    } catch (error) {
      try {
        const estimate = await this.fallback.estimate(origin, destination);
        return { ...estimate, fallbackUsed: true };
      } catch (fallbackError) {
        throw new RoutingRepositoryError("Primary and fallback route estimates failed.", [], {
          cause: fallbackError ?? error,
        });
      }
    }
  }
}
