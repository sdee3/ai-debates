import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  debates: defineTable({
    userId: v.string(),
    topic: v.string(),
    fullTopic: v.optional(v.string()),
    slug: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    responses: v.array(
      v.object({
        modelId: v.string(),
        content: v.string(),
        ranking: v.float64(),
        status: v.union(
          v.literal("pending"),
          v.literal("loading"),
          v.literal("completed"),
          v.literal("error"),
        ),
        error: v.optional(v.string()),
      }),
    ),
  }).index("by_user", ["userId"]),
  debateRateLimits: defineTable({
    clerkUserId: v.string(),
    action: v.string(),
    lastInvokedAt: v.number(),
  }).index("by_user_action", ["clerkUserId", "action"]),
  auditLogs: defineTable({
    userId: v.string(),
    action: v.string(),
    debateId: v.optional(v.id("debates")),
    details: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});
