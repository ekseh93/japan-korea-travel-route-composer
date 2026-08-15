import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";

import type { CatalogVersion } from "../application/ports/catalog-repository.js";
import type { ComposeTripResponse } from "@route-composer/contracts";
import { InMemoryItineraryCacheRepository } from "./in-memory-cache-repository.js";
import { InMemoryCatalogRepository } from "./in-memory-catalog-repository.js";
import { DynamoDbItineraryCacheRepository } from "./dynamodb-cache-repository.js";
import { DynamoDbCatalogRepository } from "./dynamodb-catalog-repository.js";
import { RepositoryError } from "./repository-errors.js";

const version: CatalogVersion = {
  cityId: "TOKYO",
  version: "catalog-v1",
  schemaVersion: "seed-v1",
  sourceChecksum: "a".repeat(64),
  placeCount: 1,
  checkedAt: "2026-08-15",
};

const place = {
  placeId: "pl_tokyo_test_place",
  cityId: "TOKYO" as const,
  zoneId: "TOKYO_SHIBUYA_HARAJUKU" as const,
  coordinates: { latitude: 35.66, longitude: 139.7 },
  costBand: "LOW" as const,
  indoorOutdoor: "MIXED" as const,
  published: true,
  evidence: [
    {
      evidenceId: "ev_tokyo_test_place",
      tier: "A_OFFICIAL_OPEN" as const,
      active: true,
    },
  ],
};

const response: ComposeTripResponse = {
  requestId: "req_test",
  tripId: "trip_test",
  catalogVersion: "catalog-v1",
  algorithmVersion: "algorithm-v1",
  generatedAt: "2026-08-15T00:00:00.000Z",
  cityId: "TOKYO",
  timezone: "Asia/Tokyo",
  locale: "ja",
  diversitySeed: 0,
  nextDiversitySeed: 1,
  summary: {
    dayCount: 1,
    visitCount: 0,
    totalVisitMinutes: 0,
    totalTravelMinutes: 0,
    estimatedWalkingMinutes: 0,
    confidence: "HIGH",
    assumptions: ["Synthetic repository test"],
  },
  dayPlans: [
    {
      dayIndex: 1,
      date: "2026-08-15",
      availableFrom: "10:00",
      availableUntil: "18:00",
      title: "Test day",
      zoneIds: ["TOKYO_SHIBUYA_HARAJUKU"],
      items: [],
      rainAlternatives: [],
      warnings: [],
    },
  ],
  warnings: [],
  methodologyPath: "/methodology",
  sourcePolicyPath: "/sources",
};

function fakeDynamoClient(handler: (command: unknown) => Promise<unknown>): DynamoDBDocumentClient {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "ap-northeast-1" }));
  client.send = handler as typeof client.send;
  return client;
}

describe("in-memory repositories", () => {
  it("returns only the requested city and catalog version", async () => {
    const repository = new InMemoryCatalogRepository(version, [place]);

    await expect(repository.getCurrentVersion("TOKYO")).resolves.toEqual(version);
    await expect(repository.getCurrentVersion("SEOUL")).resolves.toBeNull();
    await expect(repository.getPublishedPlaces("TOKYO", "catalog-v1")).resolves.toHaveLength(1);
    await expect(repository.getPublishedPlaces("TOKYO", "catalog-v2")).resolves.toEqual([]);
  });

  it("honors application-side cache expiration", async () => {
    let now = 1_000;
    const repository = new InMemoryItineraryCacheRepository(() => now);
    await repository.put("a".repeat(64), { catalogVersion: "catalog-v1", plan: response }, 60);

    await expect(repository.get("a".repeat(64))).resolves.toMatchObject({
      expiresAtEpochSeconds: 1_060,
    });
    now = 1_060;
    await expect(repository.get("a".repeat(64))).resolves.toBeNull();
  });
});

describe("DynamoDB repository adapters", () => {
  it("uses Get and paginated Query without Scan", async () => {
    const operations: string[] = [];
    const commands: unknown[] = [];
    const client = fakeDynamoClient(async (command) => {
      commands.push(command);
      operations.push(command instanceof Object ? command.constructor.name : "unknown");
      if (operations.length === 1) {
        return {
          Item: {
            itemType: "CURRENT",
            cityId: "TOKYO",
            catalogVersion: "catalog-v1",
            schemaVersion: "seed-v1",
            sourceChecksum: "a".repeat(64),
            placeCount: 1,
            checkedAt: "2026-08-15",
          },
        };
      }
      if (operations.length === 2) {
        return {
          Items: [
            {
              itemType: "PLACE",
              cityId: "TOKYO",
              catalogVersion: "catalog-v1",
              placeId: place.placeId,
              zoneId: place.zoneId,
              names: { ko: "테스트 장소", ja: "テスト場所", en: "Test place" },
              category: "LANDMARK",
              latitude: place.coordinates.latitude,
              longitude: place.coordinates.longitude,
              costBand: place.costBand,
              indoorOutdoor: place.indoorOutdoor,
              themeTags: ["FOOD"],
              companionFit: ["SOLO", "FRIEND"],
              typicalDurationMinutes: 60,
              openingStatus: "VERIFIED",
              officialUrl: "https://example.com/place",
              published: true,
              evidence: [
                {
                  ...place.evidence[0],
                  providerName: "Synthetic provider",
                  supportedClaims: ["NAME"],
                  checkedAt: "2026-08-15",
                  url: "https://example.com/evidence",
                  attribution: "Synthetic test only",
                },
              ],
            },
          ],
          LastEvaluatedKey: { pk: "page-2" },
        };
      }
      return { Items: [] };
    });
    const repository = new DynamoDbCatalogRepository("catalog-table", client);

    await expect(repository.getCurrentVersion("TOKYO")).resolves.toEqual(version);
    await expect(repository.getPublishedPlaces("TOKYO", "catalog-v1")).resolves.toHaveLength(1);
    expect(operations).toEqual(["GetCommand", "QueryCommand", "QueryCommand"]);
    expect(operations).not.toContain("ScanCommand");
    expect(
      (commands[1] as { readonly input: { readonly KeyConditionExpression?: string } }).input,
    ).toMatchObject({
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :placePrefix)",
    });
  });

  it("reads expired cache as a miss and writes TTL seconds", async () => {
    let now = 2_000;
    const sent: unknown[] = [];
    const client = fakeDynamoClient(async (command) => {
      sent.push(command);
      if (sent.length === 1) {
        return {
          Item: {
            pk: `REQUEST#${"b".repeat(64)}`,
            catalogVersion: "catalog-v1",
            plan: response,
            expiresAt: 1_999,
          },
        };
      }
      return {};
    });
    const repository = new DynamoDbItineraryCacheRepository("cache-table", client, () => now);

    await expect(repository.get("b".repeat(64))).resolves.toBeNull();
    await repository.put("c".repeat(64), { catalogVersion: "catalog-v1", plan: response }, 60);
    expect(sent).toHaveLength(2);
    expect(
      (sent[1] as { readonly input: { readonly Item: { readonly expiresAt: number } } }).input.Item,
    ).toMatchObject({ expiresAt: 2_060 });
    now = 2_061;
    await expect(repository.get("c".repeat(64))).resolves.toBeNull();
  });

  it("rejects invalid cache TTL before making an AWS call", async () => {
    const client = fakeDynamoClient(async () => ({}));
    const repository = new DynamoDbItineraryCacheRepository("cache-table", client);

    await expect(
      repository.put("d".repeat(64), { catalogVersion: "catalog-v1", plan: response }, 0),
    ).rejects.toThrow(RangeError);
  });

  it("surfaces malformed DynamoDB projections as repository errors", async () => {
    const client = fakeDynamoClient(async () => ({ Item: { itemType: "CURRENT" } }));
    const repository = new DynamoDbCatalogRepository("catalog-table", client);

    await expect(repository.getCurrentVersion("TOKYO")).rejects.toBeInstanceOf(RepositoryError);
  });
});
