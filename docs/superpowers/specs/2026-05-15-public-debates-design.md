# Public Debates — Design Spec

## Summary

Add an `isPublic` field to debates, enabling users to share debates with anyone (including unauthenticated users) via a direct URL. Debates default to Private.

## Backend

### Schema (`backend/convex/schema.ts`)
- Add `isPublic: v.boolean()` to the debates table definition.

### Mutations (`backend/convex/mutations.ts`)
- **`createDebate`** — accept optional `isPublic` arg (`v.optional(v.boolean())`, defaults to `false`). Include in the inserted document.
- **`togglePublicDebate`** (new) — accepts `id: v.id("debates")`. Requires auth + ownership. Toggles the `isPublic` boolean field via `ctx.db.patch`.

### Queries (`backend/convex/queries.ts`)
- **`getDebate`** — add access control:
  - If the debate is public → return it for anyone.
  - If private → only return it if the requesting user is authenticated and is the owner.
  - Otherwise → return `null`.
- **`listDebates`** — unchanged (already owner-only).

### Generated types
- Re-run `convex dev` or `npx convex dev` to regenerate `_generated/` types.

## Frontend

### CreateDebate.tsx
- Add a `isPublic` boolean state (default `false`).
- Add a toggle (checkbox or Tailwind-styled switch) below the topic textarea labeled "Make debate public".
- Pass `isPublic` to `api.mutations.createDebate` on submit.

### Debate.tsx
- Load `isPublic` from the debate document.
- If the current user is the owner, show a toggle to switch the debate between Public and Private.
- When public, show a "Public" badge and a share hint with the current page URL.
- Use lucide-react icons: `Globe` for public, `Lock` for private.

### DebateCard.tsx
- Show a small `Globe` or `Lock` icon indicating public/private status.

## Access Model

| Scenario | Behavior |
|---|---|
| Public debate, any visitor | Full read access |
| Private debate, owner | Full read access |
| Private debate, non-owner | Query returns `null` (equivalent to not found) |
| Private debate, unauthenticated | Query returns `null` |

No separate public listing page — sharing is purely link-based. The `/debate/:id` route has no `AuthGuard` wrapper, so unauthenticated users can reach the page; the query-level guard handles access.

## Files Changed

1. `backend/convex/schema.ts` — add `isPublic` field
2. `backend/convex/mutations.ts` — add `isPublic` to `createDebate`, add `togglePublicDebate`
3. `backend/convex/queries.ts` — update `getDebate` access control
4. `frontend/src/pages/CreateDebate.tsx` — add public/private toggle
5. `frontend/src/pages/Debate.tsx` — add toggle + badge for owners
6. `frontend/src/components/DebateCard.tsx` — add public/private icon
