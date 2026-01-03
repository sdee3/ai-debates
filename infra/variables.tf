variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ai-debates"
}

variable "domain_name" {
  description = "Custom domain name for the application (optional)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for custom domain (optional)"
  type        = string
  default     = ""
}

variable "openrouter_api_key" {
  description = "OpenRouter API key"
  type        = string
  sensitive   = true
}

variable "platform_password" {
  description = "Platform password for authentication"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Neon PostgreSQL connection URL"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Upstash Redis connection URL"
  type        = string
  sensitive   = true
}

variable "app_runner_cpu" {
  description = "CPU units for App Runner services"
  type        = string
  default     = "0.25 vCPU"
}

variable "app_runner_memory" {
  description = "Memory for App Runner services"
  type        = string
  default     = "0.5 GB"
}

variable "app_runner_max_concurrency" {
  description = "Maximum concurrent requests for App Runner"
  type        = number
  default     = 100
}

variable "app_runner_min_instances" {
  description = "Minimum instances for App Runner auto-scaling"
  type        = number
  default     = 1
}

variable "app_runner_max_instances" {
  description = "Maximum instances for App Runner auto-scaling"
  type        = number
  default     = 1
}
