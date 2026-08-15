/* global URL */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url);

async function workflow(name) {
  return readFile(new URL(`.github/workflows/${name}`, root), "utf8");
}

test("production workflows initialize the remote Terraform state backend", async () => {
  for (const name of [
    "terraform-plan.yml",
    "deploy-production.yml",
    "rollback.yml",
    "teardown.yml",
  ]) {
    const content = await workflow(name);
    for (const argument of [
      'backend-config="bucket=${{ vars.TERRAFORM_STATE_BUCKET }}"',
      'backend-config="key=production/terraform.tfstate"',
      'backend-config="region=${{ vars.AWS_REGION }}"',
      'backend-config="use_lockfile=true"',
    ]) {
      assert.match(
        content,
        new RegExp(argument.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `${name} is missing ${argument}`,
      );
    }
  }
});

test("all workflows use the Node 24-compatible pinned checkout action", async () => {
  for (const name of [
    "ci.yml",
    "terraform-plan.yml",
    "deploy-production.yml",
    "rollback.yml",
    "teardown.yml",
  ]) {
    const content = await workflow(name);
    assert.match(
      content,
      /actions\/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd\s+# v5\.0\.1/,
      `${name} must use the pinned Node 24-compatible checkout action`,
    );
    assert.doesNotMatch(content, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/);
  }
});

test("AWS-capable workflows require OIDC and protected fork guards", async () => {
  for (const name of [
    "terraform-plan.yml",
    "deploy-production.yml",
    "rollback.yml",
    "teardown.yml",
  ]) {
    const content = await workflow(name);
    assert.match(content, /configure-aws-credentials@/);
    assert.match(content, /id-token:\s+write/);
    assert.ok(
      /github\.event\.repository\.fork\s*==\s*false/.test(content) ||
        /github\.event\.pull_request\.head\.repo\.full_name\s*==\s*github\.repository/.test(
          content,
        ),
      `${name} is missing a fork protection condition`,
    );
  }
});

test("rollback workflow does not apply Terraform or modify application resources", async () => {
  const content = await workflow("rollback.yml");
  assert.doesNotMatch(content, /terraform:1\.9\.8\\\s+-chdir=.*\s+apply/);
  assert.match(content, /catalog-rollback-cli\.js/);
});
