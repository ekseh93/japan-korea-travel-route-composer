import { healthResponseSchema } from "@route-composer/contracts";

import { createComposeHandler } from "./http/handler.js";
import { DynamoDbCatalogRepository } from "./infrastructure/dynamodb-catalog-repository.js";
import { CuratedRoutingRepository } from "./infrastructure/curated-routing-repository.js";

type HttpApiEvent = {
  readonly body?: string | null;
  readonly rawPath?: string;
  readonly routeKey?: string;
  readonly requestContext?: {
    readonly requestId?: string;
    readonly http?: { readonly path?: string; readonly method?: string };
  };
};

const catalog = new DynamoDbCatalogRepository(process.env.CATALOG_TABLE_NAME ?? "");
const routing = new CuratedRoutingRepository([], {
  sameZoneBufferMinutes: 5,
  haversineCheckedAt: "2026-08-15",
});
const compose = createComposeHandler({ catalog, routing });

export async function handler(event: HttpApiEvent) {
  const path = event.rawPath ?? event.requestContext?.http?.path;
  const method = event.requestContext?.http?.method;
  if (
    path === "/health" ||
    event.routeKey === "GET /health" ||
    (method === "GET" && path === "/health")
  ) {
    const body = healthResponseSchema.parse({
      status: "ok",
      releaseSha: process.env.RELEASE_SHA ?? "local-or-release-sha",
    });
    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    };
  }

  const request = { body: event.body ?? null } as { body: string | null; requestId?: string };
  const requestId = event.requestContext?.requestId;
  if (requestId !== undefined) {
    request.requestId = requestId;
  }
  return compose(request);
}
