output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.web.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.web.id
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "web_bucket_name" {
  value = aws_s3_bucket.web.bucket
}

output "catalog_table_name" {
  value = aws_dynamodb_table.catalog.name
}

output "cache_table_name" {
  value = aws_dynamodb_table.cache.name
}
