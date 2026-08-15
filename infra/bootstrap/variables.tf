variable "project_slug" {
  type        = string
  description = "Lowercase project identifier."
}

variable "aws_region" {
  type        = string
  description = "Bootstrap region."
  default     = "ap-northeast-1"
}

variable "github_repository" {
  type        = string
  description = "Exact owner/repository for GitHub OIDC trust."
}

variable "github_oidc_thumbprint" {
  type        = string
  description = "Approved SHA-1 thumbprint for token.actions.githubusercontent.com."
  sensitive   = true
}

variable "state_bucket_name" {
  type        = string
  description = "Globally unique Terraform state bucket name."
}

variable "owner" {
  type        = string
  description = "Human owner tag."
  default     = "portfolio-owner"
}
