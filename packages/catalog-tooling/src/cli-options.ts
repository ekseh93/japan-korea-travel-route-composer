import { resolve } from "node:path";

export type CatalogValidationCliOptions = {
  readonly rootDirectory: string;
  readonly production: boolean;
  readonly asOf?: string;
  readonly help: boolean;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function usage(): string {
  return [
    "Usage: catalog-tooling validate [options]",
    "",
    "Options:",
    "  --root <directory>   Seed directory to validate (default: packages/test-fixtures)",
    "  --production         Apply production projection gates",
    "  --as-of <YYYY-MM-DD> Use a deterministic review date",
    "  --help               Show this help",
  ].join("\n");
}

export function parseCatalogValidationArgs(
  argv: readonly string[],
  repositoryRoot: string,
): CatalogValidationCliOptions {
  let rootDirectory = resolve(repositoryRoot, "packages/test-fixtures");
  let production = false;
  let asOf: string | undefined;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
    } else if (argument === "--production") {
      production = true;
    } else if (argument === "--root") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--root requires a directory.");
      }
      rootDirectory = resolve(repositoryRoot, value);
      index += 1;
    } else if (argument === "--as-of") {
      const value = argv[index + 1];
      if (value === undefined || !datePattern.test(value)) {
        throw new Error("--as-of requires a date in YYYY-MM-DD format.");
      }
      asOf = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  const options = { rootDirectory, production, help };
  return asOf === undefined ? options : { ...options, asOf };
}
