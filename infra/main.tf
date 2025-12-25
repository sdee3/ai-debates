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
provider "aws" {
  region = var.aws_region
  profile = var.environment
}
