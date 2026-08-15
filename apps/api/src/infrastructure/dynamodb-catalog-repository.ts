import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  companionTypeSchema,
  cityIdSchema,
  claimTypeSchema,
  costBandSchema,
  indoorOutdoorSchema,
  openingStatusSchema,
  placeCategorySchema,
  themeTagSchema,
  zoneIdSchema,
} from "@route-composer/contracts";
import { z } from "zod";

import type { CatalogRepository, CatalogVersion } from "../application/ports/catalog-repository.js";
import { GeoPoint } from "../domain/value-objects.js";
import type { PlaceProfile } from "../domain/trip-plan.js";
import { RepositoryError } from "./repository-errors.js";

const currentVersionItemSchema = z
  .object({
    itemType: z.literal("CURRENT"),
    cityId: cityIdSchema,
    catalogVersion: z.string().min(1),
    schemaVersion: z.string().min(1),
    sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    placeCount: z.number().int().nonnegative(),
    checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

const projectedPlaceItemSchema = z
  .object({
    itemType: z.literal("PLACE"),
    cityId: cityIdSchema,
    catalogVersion: z.string().min(1),
    placeId: z.string().min(1),
    zoneId: zoneIdSchema,
    names: z
      .object({
        ko: z.string().min(1).optional(),
        ja: z.string().min(1).optional(),
        en: z.string().min(1).optional(),
      })
      .strict()
      .refine((value) => Object.values(value).some((text) => text !== undefined)),
    category: placeCategorySchema,
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    costBand: costBandSchema,
    indoorOutdoor: indoorOutdoorSchema,
    themeTags: z.array(themeTagSchema).min(1),
    companionFit: z.array(companionTypeSchema).min(1),
    typicalDurationMinutes: z.number().int().min(15).max(360),
    openingStatus: openingStatusSchema,
    officialUrl: z.string().url().startsWith("https://").nullable(),
    published: z.literal(true),
    evidence: z
      .array(
        z
          .object({
            evidenceId: z.string().min(1),
            tier: z.enum(["A_OFFICIAL_OPEN", "B_LICENSED_EDITORIAL"]),
            active: z.boolean(),
            providerName: z.string().min(1),
            supportedClaims: z.array(claimTypeSchema).min(1),
            checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            url: z.string().url().startsWith("https://"),
            attribution: z.string().nullable(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

type ProjectedPlaceItem = z.infer<typeof projectedPlaceItemSchema>;

function key(cityId: string, sortKey: string): { readonly pk: string; readonly sk: string } {
  return { pk: `CITY#${cityId}`, sk: sortKey };
}

function parseCurrentVersion(item: unknown): CatalogVersion {
  const parsed = currentVersionItemSchema.safeParse(item);
  if (!parsed.success) {
    throw new RepositoryError("DynamoDB current catalog item is invalid.", { cause: parsed.error });
  }
  return {
    cityId: parsed.data.cityId,
    version: parsed.data.catalogVersion,
    schemaVersion: parsed.data.schemaVersion,
    sourceChecksum: parsed.data.sourceChecksum,
    placeCount: parsed.data.placeCount,
    checkedAt: parsed.data.checkedAt,
  };
}

function toPlaceProfile(item: ProjectedPlaceItem): PlaceProfile {
  return {
    placeId: item.placeId,
    cityId: item.cityId,
    zoneId: item.zoneId,
    names: Object.fromEntries(
      Object.entries(item.names).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
    category: item.category,
    coordinates: GeoPoint.create(item.latitude, item.longitude),
    costBand: item.costBand,
    indoorOutdoor: item.indoorOutdoor,
    themeTags: item.themeTags,
    companionFit: item.companionFit,
    typicalDurationMinutes: item.typicalDurationMinutes,
    openingStatus: item.openingStatus,
    officialUrl: item.officialUrl,
    published: item.published,
    evidence: item.evidence.map((evidence) => ({ ...evidence })),
  };
}

export class DynamoDbCatalogRepository implements CatalogRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  public constructor(
    tableName: string,
    client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({})),
  ) {
    this.tableName = tableName;
    this.client = client;
  }

  public async getCurrentVersion(
    cityId: ProjectedPlaceItem["cityId"],
  ): Promise<CatalogVersion | null> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key(cityId, "CURRENT"),
        ConsistentRead: true,
      }),
    );
    if (response.Item === undefined) return null;
    const version = parseCurrentVersion(response.Item);
    if (version.cityId !== cityId) {
      throw new RepositoryError("DynamoDB current catalog city does not match the key.");
    }
    return version;
  }

  public async getPublishedPlaces(
    cityId: ProjectedPlaceItem["cityId"],
    version: string,
  ): Promise<readonly PlaceProfile[]> {
    const places: PlaceProfile[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :placePrefix)",
          ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
          ExpressionAttributeValues: {
            ":pk": `CITY#${cityId}#VERSION#${version}`,
            ":placePrefix": "PLACE#",
          },
          ExclusiveStartKey: exclusiveStartKey,
          ConsistentRead: true,
        }),
      );
      for (const item of response.Items ?? []) {
        const parsed = projectedPlaceItemSchema.safeParse(item);
        if (!parsed.success) {
          throw new RepositoryError("DynamoDB catalog Place item is invalid.", {
            cause: parsed.error,
          });
        }
        if (parsed.data.cityId !== cityId || parsed.data.catalogVersion !== version) {
          throw new RepositoryError("DynamoDB Place item does not match the requested catalog.");
        }
        places.push(toPlaceProfile(parsed.data));
      }
      exclusiveStartKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (exclusiveStartKey !== undefined);

    return places;
  }
}
