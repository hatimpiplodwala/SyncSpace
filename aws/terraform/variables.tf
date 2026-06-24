variable "aws_region" {
  description = "AWS region for all resources (Lambda must pull from a private ECR repo in the same region)."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for created resources."
  type        = string
  default     = "syncspace-compact"
}

variable "github_repo" {
  description = "GitHub repo allowed to assume the deploy role, as owner/name (e.g. hatim/real-time-board)."
  type        = string
}

variable "github_branch" {
  description = "Branch allowed to assume the deploy role."
  type        = string
  default     = "main"
}

variable "create_oidc_provider" {
  description = "Create the GitHub Actions OIDC provider. Set false if the account already has one."
  type        = bool
  default     = true
}

variable "supabase_url" {
  description = "Supabase project URL (https://<ref>.supabase.co)."
  type        = string
}

variable "supabase_service_role_key" {
  description = "Supabase service-role key. Sensitive — keep out of source control."
  type        = string
  sensitive   = true
}

variable "schedule_expression" {
  description = "EventBridge schedule for the sweep. rate() or cron()."
  type        = string
  default     = "rate(1 hour)"
}

variable "compaction_min_updates" {
  description = "Minimum append-log rows before a room is folded."
  type        = number
  default     = 200
}

variable "lambda_memory_mb" {
  description = "Lambda memory (MB). Yjs replay is CPU-bound; more memory = more CPU."
  type        = number
  default     = 512
}

variable "lambda_timeout_s" {
  description = "Lambda timeout (seconds)."
  type        = number
  default     = 120
}
