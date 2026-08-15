import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCatalogValidationArgs, usage } from "./cli-options.js";
import { SeedValidationError, validateSeedDirectory } from "./seed.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

try {
  const options = parseCatalogValidationArgs(process.argv.slice(2), repositoryRoot);
  if (options.help) {
    console.log(usage());
  } else {
    const validationOptions = options.asOf
      ? { production: options.production, asOf: options.asOf }
      : { production: options.production };
    const report = validateSeedDirectory(options.rootDirectory, validationOptions);
    console.log(JSON.stringify({ ...report, rootDirectory: options.rootDirectory }, null, 2));
  }
} catch (error) {
  if (error instanceof SeedValidationError) {
    console.error(JSON.stringify({ issues: error.issues }, null, 2));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
