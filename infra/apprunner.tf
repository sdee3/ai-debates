# App Runner Service - Frontend
resource "aws_apprunner_service" "frontend" {
  service_name = "${var.project_name}-frontend"

  source_configuration {
    auto_deployments_enabled = true

    image_repository {
      image_identifier      = "${aws_ecr_repository.frontend.repository_url}:latest"
      image_repository_type = "ECR"
      
      image_configuration {
        port = 80
        runtime_environment_variables = {
          VITE_API_URL = aws_apprunner_service.backend.service_url
        }
      }
    }
    
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_secrets_access.arn
    }
  }

  instance_configuration {
    cpu    = var.app_runner_cpu
    memory = var.app_runner_memory
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.auto_scaling.arn

  health_check_configuration {
    path     = "/"
    protocol = "HTTP"
  }

  tags = {
    Service = "frontend"
  }
}

# App Runner Service - Backend
resource "aws_apprunner_service" "backend" {
  service_name = "${var.project_name}-backend"

  source_configuration {
    auto_deployments_enabled = true

    image_repository {
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"
      
      image_configuration {
        port = 3000
        runtime_environment_secrets = {
          OPENROUTER_API_KEY = aws_secretsmanager_secret.app_secrets.arn
          PLATFORM_PASSWORD = aws_secretsmanager_secret.app_secrets.arn
          DATABASE_URL       = aws_secretsmanager_secret.app_secrets.arn
          REDIS_URL          = aws_secretsmanager_secret.app_secrets.arn
        }
        start_command = "pnpm start"
      }
    }
    
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_secrets_access.arn
    }
  }

  instance_configuration {
    cpu             = var.app_runner_cpu
    memory          = var.app_runner_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.auto_scaling.arn

  health_check_configuration {
    path     = "/health"
    protocol = "HTTP"
  }

  network_configuration {
    egress_configuration {
      egress_type = "DEFAULT"
    }
  }

  tags = {
    Service = "backend"
  }
}

# Auto Scaling Configuration
resource "aws_apprunner_auto_scaling_configuration_version" "auto_scaling" {
  auto_scaling_configuration_name = "${var.project_name}-auto-scaling"

  max_concurrency = var.app_runner_max_concurrency
  max_size        = var.app_runner_max_instances
  min_size        = var.app_runner_min_instances

  tags = {
    Name = "${var.project_name}-auto-scaling"
  }
}

# VPC Connector for backend (optional - needed if using VPC resources)
# Uncomment if you need VPC access for databases in the future
# resource "aws_apprunner_vpc_connector" "backend" {
#   vpc_connector_name = "${var.project_name}-vpc-connector"
#   subnets            = var.private_subnet_ids
#   security_groups    = var.security_group_ids
# }
