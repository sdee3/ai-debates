# AWS Terraform Infrastructure - Debates App

This directory contains Terraform configuration for deploying the Debates application to AWS using App Runner, ECR, and Secrets Manager.

## Architecture

```txt
Cloudflare DNS → Route 53 → AWS App Runner (Frontend + Backend)
                              ↓
                    Neon (PostgreSQL) + Upstash (Redis)
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform Cloud** account (free for individuals)
3. **Neon** account for PostgreSQL (free tier)
4. **Upstash** account for Redis (free tier)
5. **Docker** installed locally for testing

## Setup Steps

### 1. Install Terraform

```bash
# macOS
brew install terraform

# Linux
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

### 2. Configure Terraform Cloud

1. Sign up at [app.terraform.io](https://app.terraform.io)
2. Create a new workspace named `ai-debates`
3. Install Terraform CLI and authenticate:

```bash
terraform login
```

1. Update [`main.tf`](main.tf:8) with your organization name:

```hcl
cloud {
  organization = "your-organization"  # Replace this
  workspaces {
    name = "ai-debates"
  }
}
```

### 3. Set Up External Services

#### Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Get your connection string: `postgres://user:pass@host:5432/db`

#### Upstash (Redis)

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Get your connection string: `redis://host:6379`

### 4. Configure AWS Credentials

Create an IAM user with permissions for:

- ECR (push/pull images)
- App Runner (create/update services)
- Secrets Manager (manage secrets)
- IAM (create roles)

Set up AWS credentials:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

Or use AWS CLI:

```bash
aws configure
```

### 5. Set Up GitHub Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret           | Value                                |
| ---------------- | ------------------------------------ |
| `AWS_ROLE_ARN`   | IAM role ARN for GitHub Actions OIDC |
| `TF_CLOUD_TOKEN` | Terraform Cloud API token            |

### 6. Initialize Terraform

```bash
cd infra
terraform init
```

### 7. Configure Variables

Create a `terraform.tfvars` file (gitignored):

```hcl
aws_region = "us-east-1"
environment = "dev"
project_name = "ai-debates"

# Custom domain (optional)
domain_name = "your-subdomain.yourdomain.com"
route53_zone_id = "Z1234567890ABC"

# Secrets - or use Terraform Cloud variables
openrouter_api_key = "your-openrouter-api-key"
platform_password = "your-secure-password"
database_url = "postgres://user:pass@host:5432/db"
redis_url = "redis://host:6379"
```

### 8. Deploy Infrastructure

```bash
# Review changes
terraform plan

# Apply changes
terraform apply
```

### 9. Get Outputs

After successful deployment, get your service URLs:

```bash
terraform output
```

You'll see:

- `frontend_service_url` - Your frontend URL
- `backend_service_url` - Your backend API URL
- `frontend_ecr_repository_url` - ECR URL for frontend
- `backend_ecr_repository_url` - ECR URL for backend

### 10. Configure Custom Domain (Optional)

If you have a custom domain:

1. Update `terraform.tfvars` with your domain and Route 53 zone ID
2. Run `terraform apply`
3. Update your Cloudflare DNS to point to the App Runner service URLs

## CI/CD Pipeline

The GitHub Actions workflow at [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml:1) will:

1. Build Docker images for frontend and backend
2. Push images to ECR
3. App Runner automatically deploys new images

### Manual Deployment

To manually build and push images:

```bash
# Frontend
cd frontend
docker build -t <ECR_URL>/debates-frontend:latest .
docker push <ECR_URL>/debates-frontend:latest

# Backend
cd ../server
docker build -t <ECR_URL>/debates-backend:latest .
docker push <ECR_URL>/debates-backend:latest
```

## Cost Estimate

| Service               | Monthly Cost      |
| --------------------- | ----------------- |
| App Runner (frontend) | ~$5-10            |
| App Runner (backend)  | ~$5-10            |
| ECR Storage           | ~$1-2             |
| Secrets Manager       | ~$0.40            |
| **Total**             | **~$11-22/month** |

External services (Neon + Upstash) are free tier.

## Troubleshooting

### Terraform State Issues

```bash
# Refresh state if it gets out of sync
terraform refresh

# Reinitialize if needed
terraform init -reconfigure
```

### App Runner Deployment Issues

Check deployment logs:

```bash
aws apprunner list-deployments --service-arn <SERVICE_ARN>
```

### Secrets Not Working

Verify secrets are set:

```bash
aws secretsmanager get-secret-value --secret-id <SECRET_ID>
```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

## Next Steps

1. Update backend to use PostgreSQL for data persistence
2. Update rate limiter to use Redis
3. Set up monitoring with CloudWatch
4. Configure SSL certificates for custom domain

## Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/latest/ugwelcome.html)
- [AWS ECR Documentation](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html)
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
