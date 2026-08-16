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
  validation {
    condition = length(split("/", var.github_repository)) == 2 && alltrue([
      for part in split("/", var.github_repository) : length(trimspace(part)) > 0
    ])
    error_message = "github_repository must use the exact owner/repository format."
  }
}

variable "github_repository_owner_id" {
  type        = number
  description = "Immutable GitHub owner ID used in the OIDC subject."
}

variable "github_repository_id" {
  type        = number
  description = "Immutable GitHub repository ID used in the OIDC subject."
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

variable "artifact_bucket_name" {
  type        = string
  description = "Globally unique versioned bucket for immutable Lambda release artifacts."
}

variable "owner" {
  type        = string
  description = "Human owner tag."
  default     = "portfolio-owner"
}
