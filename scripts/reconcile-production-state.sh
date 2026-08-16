#!/usr/bin/env bash
set -euo pipefail

terraform_dir="infra/environments/production"
tf() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY \
    -e AWS_SESSION_TOKEN \
    -e AWS_REGION \
    -e AWS_DEFAULT_REGION \
    -e TF_VAR_project_slug \
    -e TF_VAR_budget_email \
    -e TF_VAR_monthly_budget_usd \
    -e TF_VAR_lambda_s3_bucket \
    -e TF_VAR_lambda_s3_key \
    -e TF_VAR_lambda_source_code_hash \
    -e TF_VAR_release_sha \
    -v "$PWD:/workspace" \
    -w /workspace \
    hashicorp/terraform:1.10.5 "$@"
}

import_if_unmanaged() {
  local address="$1"
  local import_id="$2"
  if tf -chdir="$terraform_dir" state show "$address" >/dev/null 2>&1; then
    return 0
  fi
  tf -chdir="$terraform_dir" import -input=false "$address" "$import_id"
}

untaint_if_managed() {
  local address="$1"
  tf -chdir="$terraform_dir" untaint "$address" >/dev/null 2>&1 || true
}

import_if_bucket_exists() {
  local address="$1"
  local bucket="$2"
  if aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
    import_if_unmanaged "$address" "$bucket"
  fi
}

import_if_table_exists() {
  local address="$1"
  local table="$2"
  if aws dynamodb describe-table --table-name "$table" >/dev/null 2>&1; then
    import_if_unmanaged "$address" "$table"
  fi
}

import_if_log_group_exists() {
  local address="$1"
  local name="$2"
  if aws logs describe-log-groups --log-group-name-prefix "$name" \
    --query "logGroups[?logGroupName=='$name'] | length(@)" --output text | grep -q '^1$'; then
    import_if_unmanaged "$address" "$name"
  fi
}

tf -chdir="$terraform_dir" init -input=false \
  -backend-config="bucket=${TERRAFORM_STATE_BUCKET}" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="use_lockfile=true"

web_bucket="${PROJECT_SLUG}-production-web"
catalog_table="${PROJECT_SLUG}-production-catalog"
cache_table="${PROJECT_SLUG}-production-cache"
lambda_log_group="/aws/lambda/${PROJECT_SLUG}-production-api"
api_log_group="/aws/apigateway/${PROJECT_SLUG}-production"
lambda_role="${PROJECT_SLUG}-production-lambda"
budget_topic="arn:aws:sns:${AWS_REGION}:${AWS_ACCOUNT_ID}:${PROJECT_SLUG}-production-budget"
budget_name="${PROJECT_SLUG}-production-monthly"

import_if_bucket_exists aws_s3_bucket.web "$web_bucket"
import_if_bucket_exists aws_s3_bucket_public_access_block.web "$web_bucket"
import_if_bucket_exists aws_s3_bucket_versioning.web "$web_bucket"
import_if_bucket_exists aws_s3_bucket_lifecycle_configuration.web "$web_bucket"
import_if_bucket_exists aws_s3_bucket_server_side_encryption_configuration.web "$web_bucket"
import_if_bucket_exists aws_s3_bucket_policy.web "$web_bucket"

oac_id="$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${PROJECT_SLUG}-production'].Id | [0]" --output text)"
if [[ "$oac_id" != "None" && -n "$oac_id" ]]; then
  import_if_unmanaged aws_cloudfront_origin_access_control.web "$oac_id"
fi

distribution_id="$(aws cloudfront list-distributions --query "DistributionList.Items[?contains(Origins.Items[0].DomainName, '${web_bucket}')].Id | [0]" --output text)"
if [[ "$distribution_id" != "None" && -n "$distribution_id" ]]; then
  distribution_bucket="$(aws cloudfront get-distribution --id "$distribution_id" --query 'Distribution.DistributionConfig.Origins.Items[0].DomainName' --output text)"
  if [[ "$distribution_bucket" == "${web_bucket}.s3.*.amazonaws.com" ]]; then
    import_if_unmanaged aws_cloudfront_distribution.web "$distribution_id"
  fi
fi

import_if_table_exists aws_dynamodb_table.catalog "$catalog_table"
import_if_table_exists aws_dynamodb_table.cache "$cache_table"
import_if_log_group_exists aws_cloudwatch_log_group.lambda "$lambda_log_group"
import_if_log_group_exists aws_cloudwatch_log_group.api "$api_log_group"

if aws iam get-role --role-name "$lambda_role" >/dev/null 2>&1; then
  import_if_unmanaged aws_iam_role.lambda "$lambda_role"
  lambda_runtime_policy="${lambda_role}-runtime"
  if aws iam list-role-policies --role-name "$lambda_role" \
    --query "PolicyNames[?@=='$lambda_runtime_policy'] | length(@)" --output text | grep -q '^1$'; then
    import_if_unmanaged aws_iam_role_policy.lambda_runtime "${lambda_role}:${lambda_runtime_policy}"
  fi
fi

if aws sns get-topic-attributes --topic-arn "$budget_topic" >/dev/null 2>&1; then
  import_if_unmanaged aws_sns_topic.budget "$budget_topic"
  subscription_arn="$(aws sns list-subscriptions-by-topic --topic-arn "$budget_topic" --query "Subscriptions[?Protocol=='email'].SubscriptionArn | [0]" --output text)"
  if [[ "$subscription_arn" != "None" && "$subscription_arn" != "PendingConfirmation" && -n "$subscription_arn" ]]; then
    import_if_unmanaged aws_sns_topic_subscription.budget_email "$subscription_arn"
  fi
fi

if aws budgets describe-budget --account-id "$AWS_ACCOUNT_ID" --budget-name "$budget_name" >/dev/null 2>&1; then
  import_if_unmanaged aws_budgets_budget.monthly "${AWS_ACCOUNT_ID}:${budget_name}"
fi

alarm_names=(
  "${PROJECT_SLUG}-production-api-5xx"
  "${PROJECT_SLUG}-production-lambda-errors"
  "${PROJECT_SLUG}-production-lambda-duration"
  "${PROJECT_SLUG}-production-lambda-throttles"
  "${PROJECT_SLUG}-production-catalog-throttles"
)
alarm_addresses=(
  aws_cloudwatch_metric_alarm.api_5xx
  aws_cloudwatch_metric_alarm.lambda_errors
  aws_cloudwatch_metric_alarm.lambda_duration
  aws_cloudwatch_metric_alarm.lambda_throttles
  aws_cloudwatch_metric_alarm.catalog_throttles
)
for index in "${!alarm_names[@]}"; do
  alarm_name="${alarm_names[$index]}"
  if aws cloudwatch describe-alarms --alarm-names "$alarm_name" \
    --query "MetricAlarms[?AlarmName=='$alarm_name'] | length(@)" --output text | grep -q '^1$'; then
    import_if_unmanaged "${alarm_addresses[$index]}" "$alarm_name"
  fi
done

api_id="$(aws apigatewayv2 get-apis --query "Items[?Name=='${PROJECT_SLUG}-production-http'].ApiId | [0]" --output text)"
if [[ "$api_id" != "None" && -n "$api_id" ]]; then
  import_if_unmanaged aws_apigatewayv2_api.http "$api_id"

  integration_id="$(aws apigatewayv2 get-integrations --api-id "$api_id" --query "Items[?IntegrationType=='AWS_PROXY'].IntegrationId | [0]" --output text)"
  if [[ "$integration_id" != "None" && -n "$integration_id" ]]; then
    import_if_unmanaged aws_apigatewayv2_integration.lambda "${api_id}/${integration_id}"
  fi

  health_route_id="$(aws apigatewayv2 get-routes --api-id "$api_id" --query "Items[?RouteKey=='GET /health'].RouteId | [0]" --output text)"
  if [[ "$health_route_id" != "None" && -n "$health_route_id" ]]; then
    import_if_unmanaged aws_apigatewayv2_route.health "${api_id}/${health_route_id}"
  fi

  compose_route_id="$(aws apigatewayv2 get-routes --api-id "$api_id" --query "Items[?RouteKey=='POST /v1/trips:compose'].RouteId | [0]" --output text)"
  if [[ "$compose_route_id" != "None" && -n "$compose_route_id" ]]; then
    import_if_unmanaged aws_apigatewayv2_route.compose "${api_id}/${compose_route_id}"
  fi

  deployment_id="$(aws apigatewayv2 get-deployments --api-id "$api_id" --query 'Items | sort_by(@, &CreatedDate)[-1].DeploymentId' --output text)"
  if [[ "$deployment_id" != "None" && -n "$deployment_id" ]]; then
    import_if_unmanaged aws_apigatewayv2_deployment.http "${api_id}/${deployment_id}"
  fi

  if aws apigatewayv2 get-stage --api-id "$api_id" --stage-name '$default' >/dev/null 2>&1; then
    import_if_unmanaged aws_apigatewayv2_stage.default "${api_id}/\$default"
  fi
fi

function_name="${PROJECT_SLUG}-production-api"
if aws lambda get-function --function-name "$function_name" >/dev/null 2>&1; then
  untaint_if_managed aws_lambda_function.api
  import_if_unmanaged aws_lambda_function.api "$function_name"
  import_if_unmanaged aws_lambda_permission.api "${function_name}/AllowHttpApiInvoke"
fi
