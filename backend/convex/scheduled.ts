import { internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { cronJobs } from "convex/server"

const crons = cronJobs()

export const cleanupAuditLogs = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    const oldLogs = await ctx.db
      .query("auditLogs")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .collect()
    for (const log of oldLogs) {
      await ctx.db.delete(log._id)
    }
  },
})

crons.daily("cleanup-audit-logs", { hourUTC: 3, minuteUTC: 0 }, internal.scheduled.cleanupAuditLogs)

export default crons
