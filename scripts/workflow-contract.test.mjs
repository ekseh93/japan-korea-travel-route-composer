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

test("deployment workflows require reviewed inputs and protected environments", async () => {
  const deploy = await workflow("deploy-production.yml");
  assert.match(deploy, /release_sha:[\s\S]*?required:\s+true/);
  assert.match(deploy, /catalog_as_of:[\s\S]*?required:\s+true/);
  assert.match(deploy, /environment:\s+name:\s+production/);
  assert.match(deploy, /Fresh Terraform plan and apply/);
  assert.match(deploy, /-chdir=infra\/environments\/production apply/);
  assert.match(deploy, /catalog:validate --root data\/catalog-v1 --production/);
  assert.match(deploy, /catalog:build -- [\s\S]*?--root data\/catalog-v1/);
  assert.match(deploy, /@route-composer\/api deploy --prod --legacy release\/lambda/);

  const rollback = await workflow("rollback.yml");
  for (const input of [
    "reviewed_sha",
    "target_tokyo_catalog_version",
    "target_seoul_catalog_version",
    "expected_tokyo_catalog_version",
    "expected_seoul_catalog_version",
  ]) {
    assert.match(rollback, new RegExp(`${input}:\\s+[\\s\\S]*?required:\\s+true`));
  }
  assert.match(rollback, /environment:\s+name:\s+production/);
  assert.match(rollback, /ref:\s+\$\{\{ inputs\.reviewed_sha \}\}/);

  const teardown = await workflow("teardown.yml");
  assert.match(teardown, /confirmation:[\s\S]*?required:\s+true/);
  assert.match(teardown, /DESTROY-PRODUCTION/);
  assert.match(teardown, /environment:\s+name:\s+production-teardown/);

  const plan = await workflow("terraform-plan.yml");
  assert.match(plan, /environment:\s+terraform-plan/);
  assert.match(plan, /Verify approved plan inputs/);
  assert.match(plan, /BUDGET_EMAIL is not approved or configured/);
  assert.match(plan, /MONTHLY_BUDGET_USD must be an explicitly approved integer/);
  assert.match(plan, /monthly_budget_usd=\$\{\{ vars\.MONTHLY_BUDGET_USD \}\}/);
  assert.match(plan, /LAMBDA_ARTIFACT_KEY is not configured/);
  assert.match(plan, /LAMBDA_ARTIFACT_KEY must be a 40-character release SHA/);
  assert.match(plan, /LAMBDA_SOURCE_CODE_HASH is not configured/);
  assert.match(plan, /LAMBDA_SOURCE_CODE_HASH must be a Base64 SHA-256 digest/);
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
  const deploy = await workflow("deploy-production.yml");
  assert.match(deploy, /Verify approved deployment inputs/);
  assert.match(deploy, /BUDGET_EMAIL is not approved or configured/);
  assert.match(deploy, /MONTHLY_BUDGET_USD must be an explicitly approved integer/);
  assert.match(deploy, /monthly_budget_usd=\$\{\{ vars\.MONTHLY_BUDGET_USD \}\}/);
});

test("rollback workflow does not apply Terraform or modify application resources", async () => {
  const content = await workflow("rollback.yml");
  assert.doesNotMatch(content, /terraform:1\.9\.8\\\s+-chdir=.*\s+apply/);
  assert.match(content, /catalog-rollback-cli\.js/);
});
