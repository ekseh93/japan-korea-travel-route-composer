output "state_bucket_name" {
  value = aws_s3_bucket.state.bucket
}

output "artifact_bucket_name" {
  value = aws_s3_bucket.artifacts.bucket
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}

output "plan_role_arn" {
  value = aws_iam_role.plan.arn
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}
