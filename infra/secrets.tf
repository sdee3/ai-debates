# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${var.project_name}/${var.environment}/secrets"

  description = "Application secrets for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-secrets"
  }
}

# Store the secret values
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    OPENROUTER_API_KEY = var.openrouter_api_key
    PLATFORM_PASSWORD = var.platform_password
    DATABASE_URL       = var.database_url
    REDIS_URL          = var.redis_url
  })
}

# IAM Role for App Runner to access Secrets Manager
resource "aws_iam_role" "apprunner_secrets_access" {
  name = "${var.project_name}-apprunner-secrets-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-apprunner-secrets-access"
  }
}

# IAM Policy for Secrets Manager access
resource "aws_iam_role_policy" "apprunner_secrets_access" {
  name = "${var.project_name}-apprunner-secrets-access"
  role = aws_iam_role.apprunner_secrets_access.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}

# IAM Role for App Runner service instances
resource "aws_iam_role" "apprunner_instance" {
  name = "${var.project_name}-apprunner-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-apprunner-instance"
  }
}

# IAM Policy for instance to access Secrets Manager
resource "aws_iam_role_policy" "apprunner_instance_secrets" {
  name = "${var.project_name}-apprunner-instance-secrets"
  role = aws_iam_role.apprunner_instance.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}
