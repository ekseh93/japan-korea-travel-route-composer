/* global URL */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("..", import.meta.url);

async function terraform(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Terraform preserves cost, retention, and deletion boundaries", async () => {
  const production = await terraform("infra/environments/production/main.tf");
  const productionVariables = await terraform("infra/environments/production/variables.tf");
  const productionVersions = await terraform("infra/environments/production/versions.tf");
  const bootstrap = await terraform("infra/bootstrap/main.tf");

  assert.match(productionVersions, /default_tags\s*\{[\s\S]*tags\s*=\s*local\.tags/);
  assert.match(production, /Project\s*=\s*var\.project_slug/);
  assert.match(production, /resource "aws_s3_bucket" "web"[\s\S]*?force_destroy\s*=\s*false/);
  assert.match(production, /noncurrent_days\s*=\s*30/);
  assert.equal((production.match(/billing_mode\s*=\s*"PAY_PER_REQUEST"/g) ?? []).length, 2);
  assert.match(
    production,
    /ttl\s*\{[\s\S]*attribute_name\s*=\s*"expiresAt"[\s\S]*enabled\s*=\s*true/,
  );
  assert.match(production, /retention_in_days\s*=\s*var\.log_retention_days/);
  assert.match(productionVariables, /log_retention_days[\s\S]*?<= 30/);
  assert.match(bootstrap, /resource "aws_s3_bucket" "state"[\s\S]*?force_destroy\s*=\s*false/);
  assert.match(bootstrap, /prevent_destroy\s*=\s*true/);
  assert.doesNotMatch(production, /aws_nat_gateway|aws_db_instance|aws_ecs_service|aws_opensearch/);
});

test("Lambda runtime policy remains read-only for catalog access", async () => {
  const production = await terraform("infra/environments/production/main.tf");
  const policy = production.match(
    /data "aws_iam_policy_document" "lambda_runtime"[\s\S]*?resource "aws_iam_role_policy" "lambda_runtime"/,
  )?.[0];
  assert.ok(policy, "lambda runtime policy block must exist");
  assert.match(policy, /dynamodb:GetItem/);
  assert.match(policy, /dynamodb:Query/);
  assert.match(policy, /dynamodb:PutItem/);
  assert.doesNotMatch(policy, /dynamodb:\*/);
  const catalogStatement = policy.match(
    /statement\s*\{[\s\S]*?actions\s*=\s*\["dynamodb:GetItem", "dynamodb:Query"\][\s\S]*?resources\s*=\s*\[aws_dynamodb_table\.catalog\.arn\][\s\S]*?\}/,
  )?.[0];
  assert.ok(catalogStatement, "catalog read statement must exist");
  assert.doesNotMatch(catalogStatement, /PutItem/);
});

test("AWS budget is configured as an alert, not a payment block", async () => {
  const production = await terraform("infra/environments/production/main.tf");
  const variables = await terraform("infra/environments/production/variables.tf");
  assert.match(variables, /AWS Budgets is an alert, not a hard payment block/);
  assert.match(variables, /budget_email[\s\S]*?approved email address/);
  assert.match(production, /resource "aws_budgets_budget" "monthly"/);
  assert.match(production, /threshold\s*=\s*20/);
  assert.match(production, /threshold\s*=\s*100/);
});
