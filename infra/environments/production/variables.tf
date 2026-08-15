variable "project_slug" {
  type        = string
  description = "Lowercase project identifier used in resource names."

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,30}$", var.project_slug))
    error_message = "project_slug must be 3-31 lowercase letters, numbers, or hyphens."
  }
}

variable "environment" {
  type        = string
  description = "Only production is managed by this root."
  default     = "production"

  validation {
    condition     = var.environment == "production"
    error_message = "The production root cannot create another environment."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for the portfolio deployment."
  default     = "ap-northeast-1"
}

variable "owner" {
  type        = string
  description = "Human owner label for cost and incident attribution."
  default     = "portfolio-owner"
}

variable "budget_email" {
  type        = string
  description = "Budget notification recipient. It is not exposed as an output."
  sensitive   = true
}

variable "monthly_budget_usd" {
  type        = number
  description = "Budget alert threshold; AWS Budgets is an alert, not a hard payment block."
  default     = 5

  validation {
    condition     = var.monthly_budget_usd > 0 && var.monthly_budget_usd <= 100
    error_message = "monthly_budget_usd must be greater than 0 and no more than 100."
  }
}

variable "lambda_s3_bucket" {
  type        = string
  description = "Pre-existing immutable artifact bucket managed by the release process."
}

variable "lambda_s3_key" {
  type        = string
  description = "Release artifact key for the Lambda zip."
}

variable "lambda_source_code_hash" {
  type        = string
  description = "Base64 SHA-256 hash of the immutable Lambda artifact."
}

variable "release_sha" {
  type        = string
  description = "Immutable source commit identifier exposed by the health endpoint."
  default     = "local-or-release-sha"
}

variable "lambda_reserved_concurrency" {
  type        = number
  description = "Small safety ceiling for the portfolio service. Set to 0 for emergency stop."
  default     = 1

  validation {
    condition     = var.lambda_reserved_concurrency >= 0 && var.lambda_reserved_concurrency <= 10
    error_message = "lambda_reserved_concurrency must be between 0 and 10."
  }
}

variable "api_rate_limit" {
  type        = number
  description = "HTTP API steady-state request limit."
  default     = 1
}

variable "api_burst_limit" {
  type        = number
  description = "HTTP API burst limit."
  default     = 2
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention."
  default     = 7

  validation {
    condition     = var.log_retention_days >= 1 && var.log_retention_days <= 30
    error_message = "log_retention_days must be between 1 and 30."
  }
}

variable "enable_external_routing" {
  type        = bool
  description = "Reserved feature flag; no paid provider is enabled by default."
  default     = false
}

variable "enable_ai" {
  type        = bool
  description = "Reserved feature flag; AI is disabled by default."
  default     = false
}
