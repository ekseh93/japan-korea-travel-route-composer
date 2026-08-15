import type {
  CityId,
  Confidence,
  RouteMethod,
  TravelMode,
  ZoneId,
} from "@route-composer/contracts";

import type { GeoPoint } from "../../domain/value-objects.js";

export type RoutePoint = {
  readonly placeId: string;
  readonly cityId: CityId;
  readonly zoneId: ZoneId;
  readonly coordinates: GeoPoint;
};

export type RouteEstimate = {
  readonly originPlaceId: string;
  readonly destinationPlaceId: string;
  readonly originZoneId: ZoneId;
  readonly destinationZoneId: ZoneId;
  readonly mode: TravelMode;
  readonly durationMinutes: number;
  readonly distanceMeters: number | null;
  readonly confidence: Confidence;
  readonly method: RouteMethod;
  readonly checkedAt: string;
  readonly fallbackUsed: boolean;
};

export interface RoutingRepository {
  estimate(origin: RoutePoint, destination: RoutePoint): Promise<RouteEstimate>;
}
