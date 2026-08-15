import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { DynamoDbCatalogPublisher } from "./dynamodb-catalog-publisher.js";

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
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  await new DynamoDbCatalogPublisher(client).rollback({
    tableName: requiredOption(options, "--table-name"),
    targetVersions: {
      TOKYO: requiredOption(options, "--target-tokyo-version"),
      SEOUL: requiredOption(options, "--target-seoul-version"),
    },
    expectedCurrentVersions: {
      TOKYO: requiredOption(options, "--expected-tokyo-version"),
      SEOUL: requiredOption(options, "--expected-seoul-version"),
    },
  });
  console.log("Catalog pointers rolled back.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
