terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.27.0"
    }
  }

  # Terraform Cloud backend for state management
  # You'll need to create a workspace at app.terraform.io
  # Set TF_CLOUD_TOKEN environment variable or use terraform login
  cloud {
    organization = "stefandjokic"  # Replace with your Terraform Cloud org
    workspaces {
      name = "ai-debates"  # Replace with your workspace name
    }
  }
}

# AWS Provider configuration
# Credentials should be provided via environment variables:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - AWS_REGION (optional, will use var.aws_region)
# For Terraform Cloud, set these as workspace environment variables
provider "aws" {
  region = var.aws_region
}
