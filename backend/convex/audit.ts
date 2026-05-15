import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const logAuditEvent = mutation({
  args: {
    action: v.string(),
    debateId: v.optional(v.id("debates")),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")
    await ctx.db.insert("auditLogs", {
      userId,
      action: args.action,
      debateId: args.debateId,
      details: args.details,
      timestamp: Date.now(),
    })
  },
})
