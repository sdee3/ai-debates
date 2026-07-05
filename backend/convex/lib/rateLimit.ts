import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import { internalMutation, type ActionCtx } from "../_generated/server"

const HOUR_MS = 60 * 60 * 1000

export const RATE_LIMITS = {
  generateCompletion: {
    scope: "generate_completion",
    maxAttempts: 30,
    windowMs: HOUR_MS,
    errorMessage: "Too many completion requests. Please try again in an hour.",
  },
  createDebateWithSummary: {
    scope: "create_debate",
    maxAttempts: 10,
    windowMs: HOUR_MS,
    errorMessage: "Too many debate creations. Please try again in an hour.",
  },
  fetchModels: {
    scope: "fetch_models",
    maxAttempts: 60,
    windowMs: HOUR_MS,
    errorMessage: "Too many model list requests. Please try again in an hour.",
  },
} as const

type RateLimitPolicy = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS]

export const checkAndIncrement = internalMutation({
  args: {
    key: v.string(),
    maxAttempts: v.number(),
    windowMs: v.number(),
  },
  returns: v.object({ allowed: v.boolean() }),
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("actionRateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()

    if (!existing) {
      await ctx.db.insert("actionRateLimits", {
        key: args.key,
        attempts: 1,
        windowStart: now,
      })
      return { allowed: true }
    }

    if (now - existing.windowStart >= args.windowMs) {
      await ctx.db.patch(existing._id, {
        attempts: 1,
        windowStart: now,
      })
      return { allowed: true }
    }

    if (existing.attempts >= args.maxAttempts) {
      return { allowed: false }
    }

    await ctx.db.patch(existing._id, {
      attempts: existing.attempts + 1,
    })
    return { allowed: true }
  },
})

export async function enforceRateLimit(
  ctx: ActionCtx,
  policy: RateLimitPolicy,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError("Not authenticated")
  }

  const result = await ctx.runMutation(internal.lib.rateLimit.checkAndIncrement, {
    key: `${policy.scope}:${identity.subject}`,
    maxAttempts: policy.maxAttempts,
    windowMs: policy.windowMs,
  })

  if (!result.allowed) {
    throw new ConvexError(policy.errorMessage)
  }

  return identity.subject
}
