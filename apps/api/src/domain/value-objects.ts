import type { CityId, Confidence, Locale, ZoneId } from "@route-composer/contracts";

import { DomainError, domainInvariant } from "./errors.js";

const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class TimeOfDay {
  public readonly value: string;
  public readonly minutes: number;

  private constructor(value: string, minutes: number) {
    this.value = value;
    this.minutes = minutes;
  }

  public static from(value: string): TimeOfDay {
    domainInvariant(
      LOCAL_TIME_PATTERN.test(value),
      "INVALID_REQUEST",
      "Time must use HH:mm format.",
      [{ code: "INVALID_FORMAT", field: "time", message: "Expected HH:mm." }],
    );
    const [hourText, minuteText] = value.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);
    return new TimeOfDay(value, hour * 60 + minute);
  }

  public isBefore(other: TimeOfDay): boolean {
    return this.minutes < other.minutes;
  }

  public isAtOrBefore(other: TimeOfDay): boolean {
    return this.minutes <= other.minutes;
  }
}

export class TripWindow {
  public readonly startDate: string;
  public readonly nights: number;
  public readonly dayCount: number;
  public readonly arrivalTime: TimeOfDay;
  public readonly departureTime: TimeOfDay;

  private constructor(
    startDate: string,
    nights: number,
    arrivalTime: TimeOfDay,
    departureTime: TimeOfDay,
  ) {
    this.startDate = startDate;
    this.nights = nights;
    this.dayCount = nights + 1;
    this.arrivalTime = arrivalTime;
    this.departureTime = departureTime;
  }

  public static create(
    startDate: string,
    nights: number,
    arrivalTime: string,
    departureTime: string,
  ): TripWindow {
    domainInvariant(
      ISO_DATE_PATTERN.test(startDate),
      "INVALID_REQUEST",
      "Start date must use YYYY-MM-DD format.",
      [{ code: "INVALID_FORMAT", field: "startDate", message: "Expected YYYY-MM-DD." }],
    );
    domainInvariant(
      Number.isInteger(nights) && nights >= 1 && nights <= 4,
      "INVALID_REQUEST",
      "Nights must be 1 to 4.",
      [{ code: "OUT_OF_RANGE", field: "nights", message: "Nights must be between 1 and 4." }],
    );

    return new TripWindow(
      startDate,
      nights,
      TimeOfDay.from(arrivalTime),
      TimeOfDay.from(departureTime),
    );
  }
}

export class GeoPoint {
  public readonly latitude: number;
  public readonly longitude: number;

  private constructor(latitude: number, longitude: number) {
    this.latitude = latitude;
    this.longitude = longitude;
  }

  public static create(latitude: number, longitude: number): GeoPoint {
    domainInvariant(
      Number.isFinite(latitude) && latitude >= -90 && latitude <= 90,
      "INVALID_REQUEST",
      "Latitude is out of range.",
      [
        {
          code: "OUT_OF_RANGE",
          field: "latitude",
          message: "Latitude must be between -90 and 90.",
        },
      ],
    );
    domainInvariant(
      Number.isFinite(longitude) && longitude >= -180 && longitude <= 180,
      "INVALID_REQUEST",
      "Longitude is out of range.",
      [
        {
          code: "OUT_OF_RANGE",
          field: "longitude",
          message: "Longitude must be between -180 and 180.",
        },
      ],
    );
    return new GeoPoint(latitude, longitude);
  }
}

export class TravelDuration {
  public readonly minutes: number;

  private constructor(minutes: number) {
    this.minutes = minutes;
  }

  public static create(minutes: number): TravelDuration {
    domainInvariant(
      Number.isInteger(minutes) && minutes > 0 && minutes <= 24 * 60,
      "INVALID_REQUEST",
      "Travel duration is invalid.",
      [
        {
          code: "OUT_OF_RANGE",
          field: "durationMinutes",
          message: "Travel duration must be 1 to 1440 minutes.",
        },
      ],
    );
    return new TravelDuration(minutes);
  }
}

export class Score {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  public static from(value: number): Score {
    domainInvariant(
      Number.isFinite(value) && value >= 0 && value <= 100,
      "INVALID_REQUEST",
      "Score is invalid.",
      [{ code: "OUT_OF_RANGE", field: "score", message: "Score must be between 0 and 100." }],
    );
    return new Score(value);
  }
}

export class DiversitySeed {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  public static from(value: number): DiversitySeed {
    domainInvariant(
      Number.isInteger(value) && value >= 0 && value <= 2_147_483_647,
      "INVALID_REQUEST",
      "Diversity seed is invalid.",
      [
        {
          code: "OUT_OF_RANGE",
          field: "diversitySeed",
          message: "Seed is outside the supported integer range.",
        },
      ],
    );
    return new DiversitySeed(value);
  }
}

export type RouteConfidence = Confidence;
export type LocalizedName = Partial<Record<Locale, string>> & {
  readonly [key: string]: string | undefined;
};
export type PlaceLocation = {
  readonly cityId: CityId;
  readonly zoneId: ZoneId;
  readonly coordinates: GeoPoint;
};

export function assertOrderedWindow(start: TimeOfDay, end: TimeOfDay, field: string): void {
  if (!start.isBefore(end)) {
    throw new DomainError(
      "CONFLICTING_CONSTRAINTS",
      "The time window must have a positive duration.",
      [{ code: "OUTSIDE_TRIP_WINDOW", field, message: "Start time must be before end time." }],
    );
  }
}
