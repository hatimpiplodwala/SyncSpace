# These feed the GitHub Actions repo variables (Settings → Secrets and variables
# → Actions → Variables). See aws/README.md.

output "aws_region" {
  value = var.aws_region
}

output "aws_account_id" {
  value = local.account_id
}

output "ecr_repository" {
  description = "Set as repo variable ECR_REPOSITORY."
  value       = aws_ecr_repository.this.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.this.repository_url
}

output "lambda_function_name" {
  description = "Set as repo variable LAMBDA_FUNCTION_NAME."
  value       = aws_lambda_function.compact.function_name
}

output "deploy_role_arn" {
  description = "Set as repo variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.deploy.arn
}
