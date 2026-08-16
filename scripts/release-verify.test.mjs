/* global Buffer */

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs, verifyRelease } from "./release-verify.mjs";

const releaseSha = "a".repeat(40);

async function createRelease() {
  const root = await mkdtemp(join(tmpdir(), "route-composer-release-"));
  await mkdir(join(root, "web"), { recursive: true });
  const files = {
    "lambda.zip": Buffer.from("lambda"),
    "catalog-projection.json": JSON.stringify({
      checksum: "b".repeat(64),
      sourceChecksum: "c".repeat(64),
      projection: {
        places: [{ placeId: "pl_test" }],
        evidence: [{ evidenceId: "ev_test" }],
        routes: [{ routes: [{ durationMinutes: 10 }] }],
      },
    }),
  };
  for (const [file, contents] of Object.entries(files)) {
    await writeFile(join(root, file), contents);
  }
  await writeFile(join(root, "release-sha.txt"), `${releaseSha}\n`);
  await writeFile(
    join(root, "lambda-source-code-hash.txt"),
    `${createHash("sha256").update(files["lambda.zip"]).digest("base64")}\n`,
  );
  await writeFile(join(root, "sbom.json"), JSON.stringify({ bomFormat: "CycloneDX" }));
  await writeFile(join(root, "web", "index.html"), "<html></html>\n");
  const checksums = Object.entries(files)
    .map(([file, contents]) => `${createHash("sha256").update(contents).digest("hex")}  ${file}`)
    .join("\n");
  await writeFile(join(root, "SHA256SUMS"), `${checksums}\n`);
  return root;
}

test("parses release verifier arguments", () => {
  assert.deepEqual(parseArgs(["--release-dir", "out", "--release-sha", releaseSha]), {
    releaseDir: "out",
    releaseSha,
  });
});

test("verifies the immutable release contract", async () => {
  const root = await createRelease();
  try {
    await assert.doesNotReject(verifyRelease({ releaseDir: root, releaseSha }));
    await assert.doesNotReject(verifyRelease({ releaseDir: root, releaseSha }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a checksum mismatch", async () => {
  const root = await createRelease();
  try {
    await writeFile(join(root, "lambda.zip"), "tampered");
    await assert.rejects(
      verifyRelease({ releaseDir: root, releaseSha }),
      /Checksum mismatch for lambda\.zip/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a lambda source hash mismatch", async () => {
  const root = await createRelease();
  try {
    await writeFile(join(root, "lambda-source-code-hash.txt"), "YWJjZA==\n");
    await assert.rejects(
      verifyRelease({ releaseDir: root, releaseSha }),
      /Lambda source code hash does not match lambda\.zip/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a missing catalog projection", async () => {
  const root = await createRelease();
  try {
    await rm(join(root, "catalog-projection.json"));
    await assert.rejects(
      verifyRelease({ releaseDir: root, releaseSha }),
      /Required release file is missing/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
