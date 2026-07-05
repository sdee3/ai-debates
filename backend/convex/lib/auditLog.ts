import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import { internal } from "../_generated/api"
import {
  internalMutation,
  type ActionCtx,
  type MutationCtx,
} from "../_generated/server"

const auditActionValidator = v.union(
  v.literal("debate.created"),
  v.literal("debate.visibility_toggled"),
  v.literal("debate.responses_updated"),
  v.literal("debate.deleted"),
  v.literal("completion.generated"),
)

const auditMetadataValueValidator = v.union(v.string(), v.number(), v.boolean())

export const writeAuditLog = internalMutation({
  args: {
    action: auditActionValidator,
    userId: v.string(),
    debateId: v.optional(v.id("debates")),
    details: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), auditMetadataValueValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      action: args.action,
      debateId: args.debateId,
      details: args.details,
      metadata: args.metadata,
      timestamp: Date.now(),
    })
    return null
  },
})

export async function logAuditFromAction(
  ctx: ActionCtx,
  entry: {
    action:
      | "debate.created"
      | "debate.visibility_toggled"
      | "debate.responses_updated"
      | "debate.deleted"
      | "completion.generated"
    userId: string
    debateId?: Id<"debates">
    details?: string
    metadata?: Record<string, string | number | boolean>
  },
): Promise<void> {
  await ctx.runMutation(internal.lib.auditLog.writeAuditLog, entry)
}

export async function logAuditFromMutation(
  ctx: MutationCtx,
  entry: {
    action:
      | "debate.created"
      | "debate.visibility_toggled"
      | "debate.responses_updated"
      | "debate.deleted"
      | "completion.generated"
    userId: string
    debateId?: Id<"debates">
    details?: string
    metadata?: Record<string, string | number | boolean>
  },
): Promise<void> {
  await ctx.runMutation(internal.lib.auditLog.writeAuditLog, entry)
}
