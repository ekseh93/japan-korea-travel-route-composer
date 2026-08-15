import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
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
const isoDateSchema = z.string().regex(isoDatePattern);
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

export type CatalogRollbackOptions = {
  readonly tableName: string;
  readonly targetVersions: Readonly<Record<CityId, string>>;
  readonly expectedCurrentVersions: Readonly<Record<CityId, string>>;
};

const cityIds = ["TOKYO", "SEOUL"] as const satisfies readonly CityId[];
const maxBatchWriteItems = 25;
const catalogMetaSchema = z.object({
  cityId: z.enum(["TOKYO", "SEOUL"]),
  catalogVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  sourceChecksum: hashSchema,
  placeCount: z.number().int().nonnegative(),
  checkedAt: isoDateSchema,
});

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
): NonNullable<BatchWriteCommandInput["RequestItems"]>[string] {
  const { metadata } = artifact.projection;
  return cityIds.flatMap((cityId) => {
    const pk = partitionKey(cityId, metadata.version);
    const cityPlaces = artifact.projection.places.filter((place) => place.cityId === cityId);
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
    return places;
  });
}

function metadataItem(
  artifact: CatalogProjectionArtifact,
  cityId: CityId,
  checkedAt: string,
): Record<string, unknown> {
  const { metadata } = artifact.projection;
  return {
    pk: partitionKey(cityId, metadata.version),
    sk: "META",
    itemType: "META",
    cityId,
    catalogVersion: metadata.version,
    schemaVersion: metadata.schemaVersion,
    sourceChecksum: artifact.sourceChecksum,
    placeCount: artifact.projection.places.filter((place) => place.cityId === cityId).length,
    checkedAt,
    generatedAt: metadata.generatedAt,
    reviewedBy: metadata.reviewedBy,
    releaseNotes: metadata.releaseNotes,
  };
}

function metadataTransactionItems(
  tableName: string,
  artifact: CatalogProjectionArtifact,
  checkedAt: string,
): TransactWriteItem[] {
  return cityIds.map((cityId) => ({
    Put: {
      TableName: tableName,
      Item: metadataItem(artifact, cityId, checkedAt),
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    },
  }));
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

function currentPointerRollbackUpdate(
  tableName: string,
  metadata: z.infer<typeof catalogMetaSchema>,
  expectedCurrentVersion: string,
): TransactWriteItem {
  return {
    Update: {
      TableName: tableName,
      Key: currentKey(metadata.cityId),
      UpdateExpression:
        "SET #itemType = :itemType, #cityId = :cityId, #catalogVersion = :catalogVersion, #schemaVersion = :schemaVersion, #sourceChecksum = :sourceChecksum, #placeCount = :placeCount, #checkedAt = :checkedAt",
      ConditionExpression: "#catalogVersion = :expectedVersion",
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
        ":cityId": metadata.cityId,
        ":catalogVersion": metadata.catalogVersion,
        ":schemaVersion": metadata.schemaVersion,
        ":sourceChecksum": metadata.sourceChecksum,
        ":placeCount": metadata.placeCount,
        ":checkedAt": metadata.checkedAt,
        ":expectedVersion": expectedCurrentVersion,
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

    const maxRetries = options.maxBatchWriteRetries ?? 4;
    const retryDelayMs = options.retryDelayMs ?? 100;
    const sleep =
      options.sleep ??
      ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

    await this.client.send(
      new TransactWriteCommand({
        TransactItems: metadataTransactionItems(
          options.tableName,
          options.artifact,
          options.checkedAt,
        ),
      }),
    );

    for (const batch of chunks(versionItems(options.artifact), maxBatchWriteItems)) {
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

  public async rollback(options: CatalogRollbackOptions): Promise<void> {
    if (options.tableName.length === 0) throw new Error("tableName cannot be empty.");
    const metadata = await Promise.all(
      cityIds.map(async (cityId) => {
        const response = await this.client.send(
          new GetCommand({
            TableName: options.tableName,
            Key: { pk: partitionKey(cityId, options.targetVersions[cityId]), sk: "META" },
            ConsistentRead: true,
          }),
        );
        const parsed = catalogMetaSchema.safeParse(response.Item);
        if (!parsed.success || parsed.data.cityId !== cityId) {
          throw new Error(`Rollback target metadata is missing or invalid for ${cityId}.`);
        }
        if (parsed.data.catalogVersion !== options.targetVersions[cityId]) {
          throw new Error(`Rollback target metadata version does not match for ${cityId}.`);
        }
        return parsed.data;
      }),
    );

    await this.client.send(
      new TransactWriteCommand({
        TransactItems: metadata.map((item) =>
          currentPointerRollbackUpdate(
            options.tableName,
            item,
            options.expectedCurrentVersions[item.cityId],
          ),
        ),
      }),
    );
  }
}
