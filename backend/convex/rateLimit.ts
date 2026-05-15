import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const checkRateLimit = mutation({
  args: { action: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    const now = Date.now()
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) => q.eq("userId", userId).eq("action", args.action))
      .first()
    if (record && now - record.lastInvokedAt < 10000) {
      const remaining = Math.ceil((10000 - (now - record.lastInvokedAt)) / 1000)
      throw new Error(`Rate limited. Try again in ${remaining} seconds.`)
    }
    if (record) {
      await ctx.db.patch(record._id, { lastInvokedAt: now })
    } else {
      await ctx.db.insert("rateLimits", { userId, action: args.action, lastInvokedAt: now })
    }
  },
})

export const recordIpAttempt = mutation({
  args: { ip: v.string(), action: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const maxAttempts = 5

    const record = await ctx.db
      .query("ipRateLimits")
      .withIndex("by_ip_action", (q) => q.eq("ip", args.ip).eq("action", args.action))
      .first()

    if (record) {
      const recent = record.timestamps.filter((t) => now - t < oneHour)

      if (recent.length >= maxAttempts) {
        const retryAfter = Math.ceil((oneHour - (now - recent[0])) / 1000)
        throw new Error(
          `Too many sign-in attempts. Please try again in ${retryAfter} seconds.`,
        )
      }

      await ctx.db.patch(record._id, {
        timestamps: [...recent, now],
      })
    } else {
      await ctx.db.insert("ipRateLimits", {
        ip: args.ip,
        action: args.action,
        timestamps: [now],
      })
    }
  },
})
