import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SeedValidationError, validateSeedDirectory } from "./seed.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureRoot = resolve(repositoryRoot, "packages/test-fixtures");

try {
  const report = validateSeedDirectory(fixtureRoot, { production: false });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (error instanceof SeedValidationError) {
    console.error(JSON.stringify({ issues: error.issues }, null, 2));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
