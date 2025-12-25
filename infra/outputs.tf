# ECR Repository URLs
output "frontend_ecr_repository_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "backend_ecr_repository_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

# App Runner Service URLs
output "frontend_service_url" {
  description = "Frontend App Runner service URL"
  value       = aws_apprunner_service.frontend.service_url
}

output "backend_service_url" {
  description = "Backend App Runner service URL"
  value       = aws_apprunner_service.backend.service_url
}

# App Runner Service ARNs
output "frontend_service_arn" {
  description = "Frontend App Runner service ARN"
  value       = aws_apprunner_service.frontend.arn
}

output "backend_service_arn" {
  description = "Backend App Runner service ARN"
  value       = aws_apprunner_service.backend.arn
}

# Secrets Manager ARN
output "secrets_manager_arn" {
  description = "Secrets Manager secret ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

# IAM Role ARNs
output "apprunner_instance_role_arn" {
  description = "App Runner instance role ARN"
  value       = aws_iam_role.apprunner_instance.arn
}

output "apprunner_secrets_access_role_arn" {
  description = "App Runner secrets access role ARN"
  value       = aws_iam_role.apprunner_secrets_access.arn
}
