# Production security checklist for AI Debates

## Convex deployment (backend)

| Variable | Required in prod | Notes |
|----------|------------------|-------|
| `CLERK_JWT_ISSUER_DOMAIN` | Yes | Must match production Clerk instance |
| `OPENROUTER_API_KEY` | Yes | Server-only; never expose to clients |
| `IDENTITY_CONVEX_SITE_URL` | Yes | Identity `.convex.site` URL for credits HTTP API |
| `CREDITS_SERVICE_SECRET_DEBATES` | Yes | Must match Identity `CREDITS_SERVICE_SECRET_DEBATES` |
| `CREDITS_ENFORCEMENT` | Yes | Must be `"true"` in production |

## Do not enable in production

- Debug-only flags (none shipped today — keep it that way)

## Frontend (build-time)

| Variable | Notes |
|----------|-------|
| `VITE_CONVEX_URL` | Production Convex deployment |
| `VITE_CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key |
| `VITE_IDENTITY_CONVEX_URL` | Identity hub Convex URL for credits UI |

## Pre-deploy verification

1. Run `pnpm test` in `backend/` — Vitest + Convex auth gate must pass
2. Confirm `CREDITS_ENFORCEMENT=true` on prod Convex deployment
3. Set `CREDITS_SERVICE_SECRET_DEBATES` in both Identity and AI Debates Convex env
4. Deploy script applies CloudFront security headers (CSP, HSTS, X-Frame-Options, etc.)

## Security controls implemented

- Auth required for `fetchModels`, `generateCompletion`, `createDebateWithSummary`
- Debate ownership enforced before LLM calls and response updates
- Public audit/rate-limit mutations internalized
- Per-user hourly rate limits on costly actions
- Credits idempotency keys include `clerkUserId`
- Debate runner runs only for the debate owner
- Bundled credits debit for create-time auxiliary LLM calls
