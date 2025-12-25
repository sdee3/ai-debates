# AWS Terraform Deployment Plan - Debates App

## Executive Summary

This plan deploys your debates application to AWS using **Terraform** with a **minimal-code approach** by leveraging:

- **AWS Community Terraform Modules** (battle-tested, well-maintained)
- **AWS App Runner** instead of ECS (simpler, auto-scaling, pay-per-request)
- **Aurora Serverless v2** for PostgreSQL (scales to zero, cost-effective)
- **ElastiCache Serverless** for Redis (or self-hosted Redis on App Runner for lower cost)

### Why Terraform Over SST?

| Aspect            | SST                        | Terraform                 |
| ----------------- | -------------------------- | ------------------------- |
| Abstraction       | High (opinionated)         | Medium (flexible)         |
| Learning curve    | Steep for customization    | Moderate but predictable  |
| AWS coverage      | Limited constructs         | Full AWS coverage         |
| Community modules | Few                        | Thousands of modules      |
| Debugging         | "Magic" can be frustrating | Explicit state management |
| Lock-in           | SST-specific patterns      | Industry standard         |

**Terraform is excellent for this project because:**

1. Your Dockerfiles are already production-ready
2. You want explicit control (burned by SST's magic)
3. AWS community modules reduce code by 80-90%
4. State management is straightforward

---

## Architecture Overview

```mermaid
graph TB
    subgraph Internet
        CF[Cloudflare DNS]
    end
    
    subgraph AWS
        R53[Route 53 Hosted Zone]
        CF --> R53
        
        subgraph Public
            ALB[Application Load Balancer]
            R53 --> ALB
        end
        
        subgraph AppRunner[AWS App Runner]
            FE[Frontend Service<br/>Nginx + React]
            BE[Backend Service<br/>Hono/Node.js]
        end
        
        ALB --> FE
        ALB --> BE
        
        subgraph Data[Data Layer - VPC]
            PG[(Aurora Serverless v2<br/>PostgreSQL)]
            REDIS[(ElastiCache<br/>Redis/Valkey)]
        end
        
        BE --> PG
        BE --> REDIS
        
        subgraph Secrets
            SM[AWS Secrets Manager<br/>API Keys, DB Creds]
        end
        
        BE --> SM
    end
```

---

## Option Analysis: Compute Services

Given your budget constraints, here are the compute options ranked by cost-effectiveness:

### Option A: AWS App Runner (Recommended)

**Monthly cost estimate: $5-25**

| Pros                           | Cons                         |
| ------------------------------ | ---------------------------- |
| Zero infrastructure management | Less control than ECS        |
| Auto-scales to zero            | Slight cold start            |
| Built-in load balancing        | VPC connectivity costs extra |
| Direct GitHub integration      |                              |

### Option B: ECS Fargate with Spot

**Monthly cost estimate: $15-50**

| Pros                   | Cons                |
| ---------------------- | ------------------- |
| Full container control | More Terraform code |
| Spot instances = cheap | Needs ALB setup     |
| Industry standard      | More moving parts   |

### Option C: EC2 with Docker Compose

**Monthly cost estimate: $5-10 (t4g.micro)**

| Pros                      | Cons                    |
| ------------------------- | ----------------------- |
| Cheapest option           | Single point of failure |
| Your docker-compose works | Manual scaling          |
| Simple                    | No HA by default        |

**Recommendation: Start with App Runner** - minimal code, auto-scaling, and reasonable cost. Migrate to ECS later if needed.

---

## Option Analysis: Database Services

### PostgreSQL Options

| Service              | Min Cost/Month     | Scales to Zero   | Terraform Complexity |
| -------------------- | ------------------ | ---------------- | -------------------- |
| Aurora Serverless v2 | ~$15 (0.5 ACU min) | No (0.5 ACU min) | Low                  |
| RDS t4g.micro        | ~$12               | No               | Low                  |
| Neon (external)      | Free tier          | Yes              | None (external)      |
| Supabase (external)  | Free tier          | Yes              | None (external)      |

### Redis Options

| Service                | Min Cost/Month | Scales to Zero | Terraform Complexity |
| ---------------------- | -------------- | -------------- | -------------------- |
| ElastiCache Serverless | ~$6            | Yes            | Medium               |
| ElastiCache t4g.micro  | ~$12           | No             | Low                  |
| Upstash (external)     | Free tier      | Yes            | None (external)      |
| Redis on App Runner    | ~$5            | No             | Low                  |

**Budget-Conscious Recommendation:**

- **External services**: Use Neon + Upstash for free tiers (0 Terraform code for databases)
- **All-AWS**: RDS t4g.micro + ElastiCache t4g.micro (~$25/month total)

---

## Recommended Architecture (Budget-Optimized)

```mermaid
graph LR
    subgraph Terraform Managed
        ECR[ECR Repos]
        AR[App Runner<br/>Frontend + Backend]
        SM[Secrets Manager]
    end
    
    subgraph External Services - Free Tier
        NEON[(Neon PostgreSQL)]
        UPSTASH[(Upstash Redis)]
    end
    
    subgraph Existing
        R53[Route 53]
        CF[Cloudflare]
    end
    
    AR --> NEON
    AR --> UPSTASH
    AR --> SM
    CF --> R53 --> AR
```

**Total estimated cost: $5-15/month** (just App Runner)

---

## Terraform Structure (Minimal Code)

```
infra/
├── main.tf              # Provider config, backend
├── variables.tf         # Input variables
├── outputs.tf           # Outputs (URLs, etc.)
├── ecr.tf               # Container registries (~20 lines)
├── app-runner.tf        # App Runner services (~50 lines)
├── secrets.tf           # Secrets Manager (~15 lines)
└── terraform.tfvars     # Your values (gitignored)
```

**Total Terraform code: ~150-200 lines** using community modules.

### Key Modules to Use

1. **ECR**: `terraform-aws-modules/ecr/aws`
2. **App Runner**: Native `aws_apprunner_service` resource (simple enough)
3. **Secrets Manager**: `terraform-aws-modules/secrets-manager/aws`

---

## Implementation Steps

### Phase 1: Foundation (No code changes needed)

1. Create Terraform backend (S3 + DynamoDB for state locking)
2. Set up ECR repositories for frontend and backend images
3. Configure Secrets Manager for `OPENROUTER_API_KEY` and `PLATFORM_PASSWORD`

### Phase 2: Compute (Minimal code changes)

1. Deploy App Runner services using existing Dockerfiles
2. Configure auto-deployment from ECR
3. Set up custom domain mapping via Route 53

### Phase 3: Data Layer (Requires backend code changes)

1. Sign up for Neon (free PostgreSQL) or provision RDS
2. Sign up for Upstash (free Redis) or provision ElastiCache
3. Update backend to use PostgreSQL connection
4. Update rate limiter to use Redis

### Phase 4: CI/CD

1. GitHub Actions workflow to build and push images
2. ECR push triggers App Runner auto-deploy

---

## Code Changes Required

### Backend Changes (Phase 3)

1. **Add database client**: Install `pg` or `drizzle-orm`/`prisma`
2. **Add Redis client**: Install `ioredis` or `@upstash/redis`
3. **Update rate limiter**: Replace in-memory Map with Redis
4. **Add health check endpoint**: Required for App Runner

Example health check addition to [`server/src/app.ts`](server/src/app.ts:7):

```typescript
app.get("/health", (c) => c.json({ status: "ok" }))
```

### Frontend Changes

**None required** - existing Dockerfile and nginx.conf work as-is.

### Environment Variables to Add

```
# Database
DATABASE_URL=postgres://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# Existing
OPENROUTER_API_KEY=xxx
PLATFORM_PASSWORD=xxx
```

---

## Alternative: All-AWS with ECS Fargate

If you prefer everything in AWS (more Terraform but single cloud):

```mermaid
graph TB
    subgraph VPC
        subgraph Public Subnets
            ALB[Application Load Balancer]
        end
        
        subgraph Private Subnets
            ECS[ECS Fargate Cluster]
            FE[Frontend Task]
            BE[Backend Task]
            ECS --> FE
            ECS --> BE
        end
        
        subgraph Data Subnets
            RDS[(RDS PostgreSQL<br/>t4g.micro)]
            REDIS[(ElastiCache Redis<br/>t4g.micro]]
        end
    end
    
    ALB --> FE
    ALB --> BE
    BE --> RDS
    BE --> REDIS
```

**Terraform code: ~400-500 lines** using modules:

- `terraform-aws-modules/vpc/aws`
- `terraform-aws-modules/ecs/aws`
- `terraform-aws-modules/rds/aws`
- `terraform-aws-modules/elasticache/aws`
- `terraform-aws-modules/alb/aws`

**Monthly cost: ~$40-60** (RDS + ElastiCache + Fargate minimum)

---

## Recommendation Summary

| Approach                      | Terraform Lines | Monthly Cost | Complexity  |
| ----------------------------- | --------------- | ------------ | ----------- |
| **App Runner + External DBs** | ~150            | $5-15        | Low         |
| App Runner + AWS DBs          | ~250            | $30-40       | Medium      |
| ECS Fargate + AWS DBs         | ~450            | $40-60       | Medium-High |

**My recommendation: Start with App Runner + External Services (Neon + Upstash)**

Reasons:

1. Minimal Terraform code
2. Free tier databases while prototyping
3. Easy migration path to all-AWS later
4. Your existing Dockerfiles work unchanged

---

## Questions for You

1. **External vs All-AWS**: Are you okay with Neon + Upstash external services, or must everything be in AWS?

2. **CI/CD preference**: GitHub Actions, or would you prefer AWS CodePipeline?

3. **State management**: Do you want Terraform Cloud (free for individuals) or self-managed S3 backend?
