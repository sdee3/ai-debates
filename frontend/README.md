# AI Debates — Frontend

Vite + React SPA for the AI Debates app. Backend lives in `../backend/` (Convex).

## Development

```bash
pnpm install
pnpm dev
```

Ensure the Convex backend is running (`cd ../backend && pnpm dev`) and that `frontend/.env.local` has the correct `VITE_*` values (see `.env.example`).

## Build

```bash
cd ../backend && npx convex codegen   # refresh generated types if needed
cd ../frontend && pnpm build
```

## Convex type imports

The frontend imports Convex API types via the `@convex/api` alias, which points to `../backend/convex/_generated/`. Do not add a local `convex/` folder here.
