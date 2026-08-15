import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { composeTripResponseSchema } from "@route-composer/contracts";
import { z } from "zod";

import type {
  CachedItinerary,
  ItineraryCacheRepository,
} from "../application/ports/cache-repository.js";
import { RepositoryError } from "./repository-errors.js";

const MAX_ITEM_BYTES = 400 * 1024;
const cacheItemSchema = z
  .object({
    pk: z.string().regex(/^REQUEST#[a-f0-9]{64}$/),
    catalogVersion: z.string().min(1),
    plan: composeTripResponseSchema,
    expiresAt: z.number().int().positive(),
  })
  .strict();

function cacheKey(cacheKeyValue: string): string {
  const digest = cacheKeyValue.startsWith("REQUEST#")
    ? cacheKeyValue.slice("REQUEST#".length)
    : cacheKeyValue;
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new RangeError("Cache key must be a SHA-256 hexadecimal digest.");
  }
  return `REQUEST#${digest}`;
}

function assertItemSize(item: unknown): void {
  const size = new TextEncoder().encode(JSON.stringify(item)).byteLength;
  if (size > MAX_ITEM_BYTES) {
    throw new RepositoryError("DynamoDB cache item exceeds the 400 KiB item limit.");
  }
}

export class DynamoDbItineraryCacheRepository implements ItineraryCacheRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly clock: () => number;

  public constructor(
    tableName: string,
    client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({})),
    clock: () => number = () => Math.floor(Date.now() / 1000),
  ) {
    this.tableName = tableName;
    this.client = client;
    this.clock = clock;
  }

  public async get(
    cacheKeyValue: string,
    nowEpochSeconds = this.clock(),
  ): Promise<CachedItinerary | null> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: cacheKey(cacheKeyValue) },
        ConsistentRead: true,
      }),
    );
    if (response.Item === undefined) return null;
    const parsed = cacheItemSchema.safeParse(response.Item);
    if (!parsed.success) {
      throw new RepositoryError("DynamoDB cache item is invalid.", { cause: parsed.error });
    }
    if (parsed.data.expiresAt <= nowEpochSeconds) return null;
    return {
      catalogVersion: parsed.data.catalogVersion,
      plan: parsed.data.plan,
      expiresAtEpochSeconds: parsed.data.expiresAt,
    };
  }

  public async put(
    cacheKeyValue: string,
    plan: Omit<CachedItinerary, "expiresAtEpochSeconds">,
    ttlSeconds: number,
  ): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new RangeError("Cache TTL must be a positive integer.");
    }
    const expiresAt = this.clock() + ttlSeconds;
    const item = {
      pk: cacheKey(cacheKeyValue),
      catalogVersion: plan.catalogVersion,
      plan: plan.plan,
      expiresAt,
    };
    assertItemSize(item);
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }
}
