# Quick Start Guide - Deploy to AWS

This guide will help you deploy your Debates app to AWS using Terraform in about 30 minutes.

## Prerequisites Checklist

- [ ] AWS account with admin permissions
- [ ] Terraform Cloud account (free at [app.terraform.io](https://app.terraform.io))
- [ ] Neon account for PostgreSQL (free at [neon.tech](https://neon.tech))
- [ ] Upstash account for Redis (free at [upstash.com](https://upstash.com))
- [ ] Terraform CLI installed
- [ ] AWS CLI installed and configured

## Step 1: Set Up External Services (5 minutes)

### Neon (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Click "Create a project"
3. Copy the connection string: `postgres://user:pass@host:5432/db`
4. Save this for later

### Upstash (Redis)

1. Go to [upstash.com](https://upstash.com) and sign up
2. Click "Create Database"
3. Copy the connection string: `redis://host:6379`
4. Save this for later

## Step 2: Configure Terraform Cloud (5 minutes)

1. Go to [app.terraform.io](https://app.terraform.io) and sign up
2. Create a new organization
3. Create a workspace named `ai-debates`
4. Run `terraform login` in your terminal and follow the prompts
5. Update [`infra/main.tf`](infra/main.tf:8) with your organization name:

```hcl
cloud {
  organization = "your-organization"  # Replace this
  workspaces {
    name = "ai-debates"
  }
}
```

## Step 3: Configure AWS (5 minutes)

### Create IAM User

1. Go to AWS Console → IAM → Users → Create user
2. Name: `terraform-deploy`
3. Select "Attach policies directly"
4. Add these policies:
   - `AdministratorAccess` (for simplicity) or create custom policy with:
     - ECR (full access)
     - App Runner (full access)
     - Secrets Manager (full access)
     - IAM (create roles)
5. Create user and save the Access Key ID and Secret Access Key

### Configure AWS CLI

```bash
aws configure
# Enter your Access Key ID, Secret Access Key, region (us-east-1), and default output format (json)
```

## Step 4: Deploy Infrastructure (10 minutes)

### Create terraform.tfvars

Create `infra/terraform.tfvars`:

```hcl
aws_region = "us-east-1"
environment = "dev"
project_name = "ai-debates"

# Secrets
openrouter_api_key = "your-openrouter-api-key"
platform_password = "your-secure-password"
database_url = "postgres://user:pass@host:5432/db"  # From Neon
redis_url = "redis://host:6379"  # From Upstash
```

### Initialize and Apply

```bash
cd infra
terraform init
terraform plan
terraform apply
```

Type `yes` when prompted. This will create:

- ECR repositories for your Docker images
- App Runner services for frontend and backend
- Secrets Manager for your secrets
- IAM roles for App Runner

### Get Your URLs

```bash
terraform output
```

You'll see:

- `frontend_service_url` - Your frontend URL
- `backend_service_url` - Your backend API URL

## Step 5: Set Up GitHub Actions (5 minutes)

### Create IAM Role for GitHub

1. Go to AWS Console → IAM → OpenID Connect provider
2. Add provider: `token.actions.githubusercontent.com`
3. Audience: `sts.amazonaws.com`
4. Create IAM role with trust relationship:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_USERNAME/YOUR_REPO:*"
        }
      }
    }
  ]
}
```

1. Attach `AdministratorAccess` or custom policy with ECR/App Runner permissions
2. Copy the Role ARN

### Add GitHub Secrets

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `AWS_ROLE_ARN`: The IAM role ARN from above
   - `TF_CLOUD_TOKEN`: Your Terraform Cloud API token (from app.terraform.io → User Settings → Tokens)

### Push to Trigger Deployment

```bash
git add .
git commit -m "Add Terraform infrastructure"
git push origin main
```

GitHub Actions will automatically build and push Docker images to ECR, and App Runner will deploy them.

## Step 6: Verify Deployment

1. Go to the `frontend_service_url` from `terraform output`
2. You should see your debates app
3. Try creating a debate to verify the backend works

## Cost Summary

| Service               | Monthly Cost      |
| --------------------- | ----------------- |
| App Runner (frontend) | ~$5-10            |
| App Runner (backend)  | ~$5-10            |
| ECR Storage           | ~$1-2             |
| Secrets Manager       | ~$0.40            |
| **Total**             | **~$11-22/month** |

Neon and Upstash are free tier.

## Troubleshooting

### Terraform init fails

```bash
# Re-authenticate with Terraform Cloud
terraform login
```

### terraform apply fails

```bash
# Check the error message and fix the issue
# Then run again
terraform apply
```

### App Runner service not starting

1. Go to AWS Console → App Runner
2. Click on your service
3. Check the "Logs" tab for errors

### GitHub Actions fails

1. Go to your repo → Actions tab
2. Click on the failed workflow
3. Check the logs for errors

## Next Steps

1. **Add database persistence**: Update backend to save debates to PostgreSQL
2. **Add Redis rate limiting**: Replace in-memory rate limiter with Redis
3. **Set up custom domain**: Configure Cloudflare to point to App Runner URLs
4. **Add monitoring**: Set up CloudWatch alarms

## Cleanup

To destroy all resources:

```bash
cd infra
terraform destroy
```

## Resources

- [Full Documentation](infra/README.md)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS App Runner](https://docs.aws.amazon.com/apprunner/latest/ugwelcome.html)
