import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getClerkUserIdOrNull(
  ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export async function requireClerkUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const clerkUserId = await getClerkUserIdOrNull(ctx);
  if (!clerkUserId) {
    throw new Error("Not authenticated");
  }
  return clerkUserId;
}
