import { v } from "convex/values"
import { internalQuery } from "../_generated/server"

export const getDebateOwnerId = internalQuery({
  args: { id: v.id("debates") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id }) => {
    const debate = await ctx.db.get(id)
    return debate?.userId ?? null
  },
})
