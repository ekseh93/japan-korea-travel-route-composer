import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildUsage, parseCatalogBuildArgs } from "./build-options.js";
import { buildProjection, SeedValidationError, writeProjectionArtifact } from "./projection.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

try {
  const options = parseCatalogBuildArgs(process.argv.slice(2), repositoryRoot);
  if (options.help) {
    console.log(buildUsage());
  } else {
    const result = buildProjection(options.rootDirectory, {
      catalogVersion: options.catalogVersion,
      generatedAt: options.generatedAt,
      reviewedBy: options.reviewedBy,
      releaseNotes: options.releaseNotes,
      production: options.production,
      ...(options.asOf === undefined ? {} : { asOf: options.asOf }),
    });
    writeProjectionArtifact(options.outputFile, result);
    console.log(
      JSON.stringify(
        {
          checksum: result.checksum,
          sourceChecksum: result.sourceChecksum,
          outputFile: options.outputFile,
          placeCount: result.projection.places.length,
          evidenceCount: result.projection.evidence.length,
          routeCount: result.projection.routes.reduce(
            (count, matrix) => count + matrix.routes.length,
            0,
          ),
        },
        null,
        2,
      ),
    );
  }
} catch (error) {
  if (error instanceof SeedValidationError) {
    console.error(JSON.stringify({ issues: error.issues }, null, 2));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
