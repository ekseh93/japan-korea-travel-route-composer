import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";

import {
  DynamoDbCatalogPublisher,
  parseCatalogProjectionArtifact,
  type CatalogProjectionArtifact,
} from "./dynamodb-catalog-publisher";

function fakeDynamoClient(handler: (command: unknown) => Promise<unknown>): DynamoDBDocumentClient {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "ap-northeast-1" }));
  client.send = handler as typeof client.send;
  return client;
}

function createArtifact(placeCountPerCity = 13): CatalogProjectionArtifact {
  const places = ["TOKYO", "SEOUL"].flatMap((cityId) =>
    Array.from({ length: placeCountPerCity }, (_, index) => {
      const isTokyo = cityId === "TOKYO";
      const placeId = `pl_${cityId.toLowerCase()}_${index}`;
      const evidenceId = `ev_${cityId.toLowerCase()}_${index}`;
      return {
        placeId,
        cityId: isTokyo ? ("TOKYO" as const) : ("SEOUL" as const),
        zoneId: isTokyo ? ("TOKYO_SHIBUYA_HARAJUKU" as const) : ("SEOUL_HONGDAE_YEONNAM" as const),
        names: { ko: `장소 ${index}`, ja: `場所 ${index}`, en: `Place ${index}` },
        category: "LANDMARK" as const,
        latitude: isTokyo ? 35.66 : 37.55,
        longitude: isTokyo ? 139.7 : 126.92,
        costBand: "LOW" as const,
        indoorOutdoor: "MIXED" as const,
        themeTags: ["CULTURE_HISTORY" as const],
        companionFit: ["SOLO" as const, "FRIEND" as const],
        typicalDurationMinutes: 60,
        openingStatus: "VERIFIED" as const,
        officialUrl: "https://example.com/place",
        published: true as const,
        evidence: [
          {
            evidenceId,
            tier: "A_OFFICIAL_OPEN" as const,
            active: true,
            providerName: "Synthetic publisher test",
            supportedClaims: ["NAME" as const],
            checkedAt: "2026-08-15",
            url: "https://example.com/evidence",
            attribution: "Synthetic publisher test",
          },
        ],
      };
    }),
  );
  return parseCatalogProjectionArtifact({
    checksum: "a".repeat(64),
    sourceChecksum: "b".repeat(64),
    projection: {
      metadata: {
        version: "catalog-publisher-test-v1",
        generatedAt: "2026-08-15T00:00:00.000Z",
        sourceChecksum: "b".repeat(64),
        schemaVersion: "api-v1",
        cityStats: {
          TOKYO: {
            placeCount: placeCountPerCity,
            publishedPlaceCount: placeCountPerCity,
            evidenceCount: placeCountPerCity,
          },
          SEOUL: {
            placeCount: placeCountPerCity,
            publishedPlaceCount: placeCountPerCity,
            evidenceCount: placeCountPerCity,
          },
        },
        reviewedBy: "publisher-test",
        releaseNotes: "Synthetic publisher contract test.",
      },
      places,
      evidence: [],
      routes: [],
    },
  });
}

describe("DynamoDB catalog publisher", () => {
  it("writes version batches before atomically promoting both current pointers", async () => {
    const commands: unknown[] = [];
    const client = fakeDynamoClient(async (command) => {
      commands.push(command);
      return {};
    });

    const result = await new DynamoDbCatalogPublisher(client).publish({
      tableName: "catalog-table",
      artifact: createArtifact(),
      checkedAt: "2026-08-15",
      expectedPreviousVersions: { TOKYO: null, SEOUL: "catalog-old-v1" },
      retryDelayMs: 0,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({
      version: "catalog-publisher-test-v1",
      sourceChecksum: "b".repeat(64),
      placeCountByCity: { TOKYO: 13, SEOUL: 13 },
    });
    expect(commands.map((command) => (command as object).constructor.name)).toEqual([
      "BatchWriteCommand",
      "BatchWriteCommand",
      "TransactWriteCommand",
    ]);
    const firstBatch = commands[0] as {
      readonly input: { readonly RequestItems: Record<string, readonly unknown[]> };
    };
    expect(firstBatch.input.RequestItems["catalog-table"]).toHaveLength(25);
    const transaction = commands[2] as {
      readonly input: {
        readonly TransactItems: readonly {
          readonly Update?: { readonly ConditionExpression?: string; readonly TableName?: string };
        }[];
      };
    };
    expect(transaction.input.TransactItems).toHaveLength(2);
    expect(transaction.input.TransactItems[0]?.Update).toMatchObject({
      TableName: "catalog-table",
      ConditionExpression: "attribute_not_exists(#catalogVersion)",
    });
    expect(transaction.input.TransactItems[1]?.Update).toMatchObject({
      ConditionExpression: "#catalogVersion = :expectedVersion",
    });
  });

  it("retries unprocessed batches and stops before pointer promotion after the retry budget", async () => {
    let calls = 0;
    const sleepCalls: number[] = [];
    const client = fakeDynamoClient(async (command) => {
      calls += 1;
      if (calls <= 2) {
        const input = (
          command as {
            readonly input: { readonly RequestItems: Record<string, readonly unknown[]> };
          }
        ).input;
        return { UnprocessedItems: input.RequestItems };
      }
      return {};
    });

    await expect(
      new DynamoDbCatalogPublisher(client).publish({
        tableName: "catalog-table",
        artifact: createArtifact(1),
        checkedAt: "2026-08-15",
        expectedPreviousVersions: { TOKYO: null, SEOUL: null },
        maxBatchWriteRetries: 1,
        retryDelayMs: 100,
        sleep: async (milliseconds) => {
          sleepCalls.push(milliseconds);
        },
      }),
    ).rejects.toThrow("remained unprocessed");
    expect(calls).toBe(2);
    expect(sleepCalls).toEqual([100]);
  });

  it("rejects an artifact whose metadata count is inconsistent before AWS calls", async () => {
    const client = fakeDynamoClient(async () => {
      throw new Error("AWS must not be called");
    });
    const artifact = createArtifact(1);
    const invalid = parseCatalogProjectionArtifact({
      ...artifact,
      projection: {
        ...artifact.projection,
        metadata: {
          ...artifact.projection.metadata,
          cityStats: {
            ...artifact.projection.metadata.cityStats,
            TOKYO: { ...artifact.projection.metadata.cityStats.TOKYO, publishedPlaceCount: 2 },
          },
        },
      },
    });

    await expect(
      new DynamoDbCatalogPublisher(client).publish({
        tableName: "catalog-table",
        artifact: invalid,
        checkedAt: "2026-08-15",
        expectedPreviousVersions: { TOKYO: null, SEOUL: null },
      }),
    ).rejects.toThrow("Place count does not match metadata");
  });
});
