import { readFileSync } from "node:fs";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import {
  DynamoDbCatalogPublisher,
  parseCatalogProjectionArtifact,
} from "./dynamodb-catalog-publisher.js";

function requiredOption(args: ReadonlyMap<string, string>, name: string): string {
  const value = args.get(name);
  if (value === undefined || value.length === 0)
    throw new Error(`Missing required option: ${name}`);
  return value;
}

function parseOptions(argv: readonly string[]): ReadonlyMap<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (name === undefined || value === undefined || !name.startsWith("--")) {
      throw new Error("Options must use --name value pairs.");
    }
    options.set(name, value);
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const artifact = parseCatalogProjectionArtifact(
    JSON.parse(readFileSync(requiredOption(options, "--artifact"), "utf8")) as unknown,
  );
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const result = await new DynamoDbCatalogPublisher(client).publish({
    tableName: requiredOption(options, "--table-name"),
    artifact,
    checkedAt: requiredOption(options, "--checked-at"),
    expectedPreviousVersions: {
      TOKYO: options.get("--expected-tokyo-version") || null,
      SEOUL: options.get("--expected-seoul-version") || null,
    },
  });
  console.log(JSON.stringify(result));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
