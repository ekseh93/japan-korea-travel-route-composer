import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  type BatchWriteCommandInput,
  type TransactWriteCommandInput,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  publishedEvidenceSchema,
  publishedPlaceSchema,
  type CityId,
} from "@route-composer/contracts";
import { z } from "zod";

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
type TransactWriteItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

const cityStatsSchema = z
  .object({
    placeCount: z.number().int().nonnegative(),
    publishedPlaceCount: z.number().int().nonnegative(),
    evidenceCount: z.number().int().nonnegative(),
  })
  .strict();

const projectionArtifactSchema = z
  .object({
    checksum: hashSchema,
    sourceChecksum: hashSchema,
    projection: z
      .object({
        metadata: z
          .object({
            version: z.string().min(1),
            generatedAt: z.string().datetime({ offset: true }),
            sourceChecksum: hashSchema,
            schemaVersion: z.string().min(1),
            cityStats: z.object({ TOKYO: cityStatsSchema, SEOUL: cityStatsSchema }).strict(),
            reviewedBy: z.string().min(1),
            releaseNotes: z.string().min(1),
          })
          .strict(),
        places: z.array(publishedPlaceSchema),
        evidence: z.array(publishedEvidenceSchema),
        routes: z.array(z.unknown()),
      })
      .strict(),
  })
  .strict();

export type CatalogProjectionArtifact = z.infer<typeof projectionArtifactSchema>;

export type CatalogPublishOptions = {
  readonly tableName: string;
  readonly artifact: CatalogProjectionArtifact;
  readonly checkedAt: string;
  readonly expectedPreviousVersions: Readonly<Record<CityId, string | null>>;
  readonly maxBatchWriteRetries?: number;
  readonly retryDelayMs?: number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
};

export type CatalogPublishResult = {
  readonly version: string;
  readonly sourceChecksum: string;
  readonly placeCountByCity: Readonly<Record<CityId, number>>;
};

const cityIds = ["TOKYO", "SEOUL"] as const satisfies readonly CityId[];
const maxBatchWriteItems = 25;

function partitionKey(cityId: CityId, version: string): string {
  return `CITY#${cityId}#VERSION#${version}`;
}

function currentKey(cityId: CityId): { readonly pk: string; readonly sk: string } {
  return { pk: `CITY#${cityId}`, sk: "CURRENT" };
}

function chunks<T>(items: readonly T[], size: number): readonly T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function validateArtifact(artifact: CatalogProjectionArtifact, checkedAt: string): void {
  if (!isoDatePattern.test(checkedAt)) {
    throw new RangeError("checkedAt must use YYYY-MM-DD format.");
  }
  if (artifact.projection.metadata.sourceChecksum !== artifact.sourceChecksum) {
    throw new Error("Catalog artifact metadata source checksum does not match the artifact.");
  }
  for (const cityId of cityIds) {
    const places = artifact.projection.places.filter((place) => place.cityId === cityId);
    const expectedCount = artifact.projection.metadata.cityStats[cityId].publishedPlaceCount;
    if (places.length !== expectedCount) {
      throw new Error(`Catalog artifact Place count does not match metadata for ${cityId}.`);
    }
  }
}

function versionItems(
  artifact: CatalogProjectionArtifact,
  checkedAt: string,
): NonNullable<BatchWriteCommandInput["RequestItems"]>[string] {
  const { metadata } = artifact.projection;
  const items = cityIds.flatMap((cityId) => {
    const pk = partitionKey(cityId, metadata.version);
    const cityPlaces = artifact.projection.places.filter((place) => place.cityId === cityId);
    const meta = {
      pk,
      sk: "META",
      itemType: "META" as const,
      cityId,
      catalogVersion: metadata.version,
      schemaVersion: metadata.schemaVersion,
      sourceChecksum: artifact.sourceChecksum,
      placeCount: cityPlaces.length,
      checkedAt,
      generatedAt: metadata.generatedAt,
      reviewedBy: metadata.reviewedBy,
      releaseNotes: metadata.releaseNotes,
    };
    const places = cityPlaces.map((place) => ({
      PutRequest: {
        Item: {
          pk,
          sk: `PLACE#${place.placeId}`,
          itemType: "PLACE" as const,
          catalogVersion: metadata.version,
          ...place,
        },
      },
    }));
    return [{ PutRequest: { Item: meta } }, ...places];
  });
  return items;
}

function currentPointerUpdate(
  tableName: string,
  cityId: CityId,
  artifact: CatalogProjectionArtifact,
  checkedAt: string,
  expectedPreviousVersion: string | null,
): TransactWriteItem {
  const metadata = artifact.projection.metadata;
  const placeCount = artifact.projection.places.filter((place) => place.cityId === cityId).length;
  const condition =
    expectedPreviousVersion === null
      ? "attribute_not_exists(#catalogVersion)"
      : "#catalogVersion = :expectedVersion";
  return {
    Update: {
      TableName: tableName,
      Key: currentKey(cityId),
      UpdateExpression:
        "SET #itemType = :itemType, #cityId = :cityId, #catalogVersion = :catalogVersion, #schemaVersion = :schemaVersion, #sourceChecksum = :sourceChecksum, #placeCount = :placeCount, #checkedAt = :checkedAt",
      ConditionExpression: condition,
      ExpressionAttributeNames: {
        "#itemType": "itemType",
        "#cityId": "cityId",
        "#catalogVersion": "catalogVersion",
        "#schemaVersion": "schemaVersion",
        "#sourceChecksum": "sourceChecksum",
        "#placeCount": "placeCount",
        "#checkedAt": "checkedAt",
      },
      ExpressionAttributeValues: {
        ":itemType": "CURRENT",
        ":cityId": cityId,
        ":catalogVersion": metadata.version,
        ":schemaVersion": metadata.schemaVersion,
        ":sourceChecksum": artifact.sourceChecksum,
        ":placeCount": placeCount,
        ":checkedAt": checkedAt,
        ...(expectedPreviousVersion === null
          ? {}
          : { ":expectedVersion": expectedPreviousVersion }),
      },
    },
  };
}

export function parseCatalogProjectionArtifact(value: unknown): CatalogProjectionArtifact {
  return projectionArtifactSchema.parse(value);
}

export class DynamoDbCatalogPublisher {
  private readonly client: DynamoDBDocumentClient;

  public constructor(
    client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({})),
  ) {
    this.client = client;
  }

  public async publish(options: CatalogPublishOptions): Promise<CatalogPublishResult> {
    validateArtifact(options.artifact, options.checkedAt);
    if (options.tableName.length === 0) throw new Error("tableName cannot be empty.");

    const items = versionItems(options.artifact, options.checkedAt);
    const maxRetries = options.maxBatchWriteRetries ?? 4;
    const retryDelayMs = options.retryDelayMs ?? 100;
    const sleep =
      options.sleep ??
      ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

    for (const batch of chunks(items, maxBatchWriteItems)) {
      let pending = batch;
      for (let attempt = 0; ; attempt += 1) {
        const response = await this.client.send(
          new BatchWriteCommand({ RequestItems: { [options.tableName]: pending } }),
        );
        pending = response.UnprocessedItems?.[options.tableName] ?? [];
        if (pending.length === 0) break;
        if (attempt >= maxRetries) {
          throw new Error(
            `DynamoDB Catalog batch remained unprocessed after ${maxRetries} retries.`,
          );
        }
        await sleep(Math.min(5_000, retryDelayMs * 2 ** attempt));
      }
    }

    const transactItems = cityIds.map((cityId) => {
      const item = currentPointerUpdate(
        options.tableName,
        cityId,
        options.artifact,
        options.checkedAt,
        options.expectedPreviousVersions[cityId],
      );
      if (item.Update === undefined) throw new Error("Catalog pointer update was not created.");
      return item;
    });
    await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));

    return {
      version: options.artifact.projection.metadata.version,
      sourceChecksum: options.artifact.sourceChecksum,
      placeCountByCity: Object.fromEntries(
        cityIds.map((cityId) => [
          cityId,
          options.artifact.projection.places.filter((place) => place.cityId === cityId).length,
        ]),
      ) as Record<CityId, number>,
    };
  }
}
