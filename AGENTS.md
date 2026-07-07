# AI Debates

Watch AI models debate any topic. Identity-connected satellite app using Clerk for auth and Convex for backend.

## Layout

```
debates/
  frontend/   # Vite React SPA (package.json, src/, vite.config.ts)
  backend/    # Convex backend (convex/, convex.json, package.json)
  scripts/    # Deploy and tooling scripts
  docs/       # Security and ops docs
  .github/    # Dependabot and CI config
```

## Commands

- **Package manager:** pnpm (run from `frontend/` or `backend/`, not repo root)
- **Frontend dev:** `cd frontend && pnpm dev`
- **Frontend build:** `cd frontend && pnpm build` (run `cd backend && npx convex codegen` first if generated types are stale)
- **Backend dev:** `cd backend && pnpm dev`
- **Backend test:** `cd backend && pnpm test`
- **Deploy frontend:** `./scripts/deploy-frontend.sh` (from repo root; AWS config in `scripts/.env`)

## Frontend

**Location:** `frontend/` — Vite, React 19, React Router v7, Tailwind CSS v4

**Convex types:** `@convex/api` resolves to `../backend/convex/_generated/api.d.ts` (see `frontend/tsconfig.app.json` and `frontend/vite.config.ts`).

**Deployment:** `./scripts/deploy-frontend.sh` — S3 + CloudFront; prod env written to `frontend/.env.production`, AWS config in `scripts/.env`.

## Backend

**Location:** `backend/` — Convex functions, schema, HTTP routes

When working on Convex code, **always read `backend/convex/_generated/ai/guidelines.md` first** for API guidelines and patterns.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `backend/convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install` from `backend/`.
<!-- convex-ai-end -->
