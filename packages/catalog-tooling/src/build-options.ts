import { resolve } from "node:path";

export type CatalogBuildCliOptions = {
  readonly rootDirectory: string;
  readonly outputFile: string;
  readonly production: boolean;
  readonly asOf?: string;
  readonly catalogVersion: string;
  readonly generatedAt: string;
  readonly reviewedBy: string;
  readonly releaseNotes: string;
  readonly help: boolean;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function buildUsage(): string {
  return [
    "Usage: catalog-tooling build [options]",
    "",
    "Options:",
    "  --root <directory>             Seed directory (default: packages/test-fixtures)",
    "  --output <file>                Projection artifact (default: packages/catalog-tooling/dist/catalog-projection.json)",
    "  --production                   Apply production projection gates",
    "  --as-of <YYYY-MM-DD>           Use a deterministic review date",
    "  --catalog-version <value>      Immutable catalog version (default: catalog-local-v1)",
    "  --generated-at <UTC timestamp>  Deterministic build timestamp (default: 2026-08-15T00:00:00.000Z)",
    "  --reviewed-by <value>          Curator identity (default: local-curator)",
    "  --release-notes <value>        Release notes (default: synthetic fixture build)",
    "  --help                         Show this help",
  ].join("\n");
}

export function parseCatalogBuildArgs(
  argv: readonly string[],
  repositoryRoot: string,
): CatalogBuildCliOptions {
  let rootDirectory = resolve(repositoryRoot, "packages/test-fixtures");
  let outputFile = resolve(repositoryRoot, "packages/catalog-tooling/dist/catalog-projection.json");
  let production = false;
  let asOf: string | undefined;
  let catalogVersion = "catalog-local-v1";
  let generatedAt = "2026-08-15T00:00:00.000Z";
  let reviewedBy = "local-curator";
  let releaseNotes = "Synthetic fixture build";
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
    } else if (argument === "--production") {
      production = true;
    } else if (
      argument === "--root" ||
      argument === "--output" ||
      argument === "--catalog-version" ||
      argument === "--generated-at" ||
      argument === "--reviewed-by" ||
      argument === "--release-notes" ||
      argument === "--as-of"
    ) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      if (argument === "--root") rootDirectory = resolve(repositoryRoot, value);
      if (argument === "--output") outputFile = resolve(repositoryRoot, value);
      if (argument === "--catalog-version") catalogVersion = value;
      if (argument === "--generated-at") generatedAt = value;
      if (argument === "--reviewed-by") reviewedBy = value;
      if (argument === "--release-notes") releaseNotes = value;
      if (argument === "--as-of") asOf = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (asOf !== undefined && !datePattern.test(asOf)) {
    throw new Error("--as-of requires a date in YYYY-MM-DD format.");
  }
  if (!isoDateTimePattern.test(generatedAt)) {
    throw new Error("--generated-at requires a UTC timestamp such as 2026-08-15T00:00:00.000Z.");
  }
  if (catalogVersion.length === 0 || reviewedBy.length === 0 || releaseNotes.length === 0) {
    throw new Error("--catalog-version, --reviewed-by, and --release-notes cannot be empty.");
  }

  const options = {
    rootDirectory,
    outputFile,
    production,
    catalogVersion,
    generatedAt,
    reviewedBy,
    releaseNotes,
    help,
  };
  return asOf === undefined ? options : { ...options, asOf };
}
