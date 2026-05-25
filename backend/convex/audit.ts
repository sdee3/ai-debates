import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireClerkUserId } from "./lib/auth"

export const logAuditEvent = mutation({
  args: {
    action: v.string(),
    debateId: v.optional(v.id("debates")),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx)
    await ctx.db.insert("auditLogs", {
      userId,
      action: args.action,
      debateId: args.debateId,
      details: args.details,
      timestamp: Date.now(),
    })
  },
})
