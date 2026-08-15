/* global console, process */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const options = { releaseDir: "release", releaseSha: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--release-dir" || argument === "--release-sha") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      if (argument === "--release-dir") options.releaseDir = value;
      if (argument === "--release-sha") options.releaseSha = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  if (!options.help && !/^[a-f0-9]{40}$/.test(options.releaseSha)) {
    throw new Error("--release-sha requires a 40-character commit SHA.");
  }
  return options;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseSha256Sums(contents) {
  return new Map(
    contents
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const match = /^(?<checksum>[a-f0-9]{64})\s+[* ](?<file>.+)$/.exec(line);
        if (match === null) throw new Error(`Invalid SHA256SUMS line: ${line}`);
        return [match.groups.file, match.groups.checksum];
      }),
  );
}

async function readRequired(file) {
  try {
    return await readFile(file);
  } catch (error) {
    throw new Error(`Required release file is missing: ${file}`, { cause: error });
  }
}

async function verifyRelease({ releaseDir, releaseSha }) {
  const root = resolve(releaseDir);
  const releaseShaFile = await readRequired(join(root, "release-sha.txt"));
  if (releaseShaFile.toString("utf8").trim() !== releaseSha) {
    throw new Error("Release SHA does not match the reviewed commit.");
  }

  const sums = parseSha256Sums((await readRequired(join(root, "SHA256SUMS"))).toString("utf8"));
  for (const file of ["lambda.zip", "catalog-projection.json"]) {
    const expected = sums.get(file);
    if (expected === undefined) throw new Error(`SHA256SUMS does not cover ${file}.`);
    const actual = sha256(await readRequired(join(root, file)));
    if (actual !== expected) throw new Error(`Checksum mismatch for ${file}.`);
  }

  const lambdaHash = (await readRequired(join(root, "lambda-source-code-hash.txt")))
    .toString("utf8")
    .trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(lambdaHash)) {
    throw new Error("Lambda source code hash is not valid base64.");
  }
  const sbom = JSON.parse((await readRequired(join(root, "sbom.json"))).toString("utf8"));
  if (sbom === null || typeof sbom !== "object") throw new Error("SBOM must be a JSON object.");

  const projection = JSON.parse(
    (await readRequired(join(root, "catalog-projection.json"))).toString("utf8"),
  );
  if (
    projection === null ||
    typeof projection !== "object" ||
    !/^[a-f0-9]{64}$/.test(projection.checksum) ||
    !/^[a-f0-9]{64}$/.test(projection.sourceChecksum) ||
    projection.projection === null ||
    typeof projection.projection !== "object" ||
    !Array.isArray(projection.projection.places) ||
    !Array.isArray(projection.projection.evidence) ||
    !Array.isArray(projection.projection.routes)
  ) {
    throw new Error("Catalog projection artifact has an invalid public shape.");
  }

  await readRequired(join(root, "web", "index.html"));
  return {
    releaseSha,
    lambdaChecksum: sums.get("lambda.zip"),
    catalogChecksum: sums.get("catalog-projection.json"),
    placeCount: projection.projection.places.length,
    evidenceCount: projection.projection.evidence.length,
    routeCount: projection.projection.routes.reduce(
      (count, matrix) => count + (Array.isArray(matrix.routes) ? matrix.routes.length : 0),
      0,
    ),
  };
}

export { parseArgs, parseSha256Sums, verifyRelease };

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(
        "Usage: node scripts/release-verify.mjs --release-dir <directory> --release-sha <40-char SHA>",
      );
    } else {
      console.log(JSON.stringify(await verifyRelease(options), null, 2));
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
