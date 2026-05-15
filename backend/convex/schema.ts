import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  debates: defineTable({
    userId: v.string(),
    topic: v.string(),
    fullTopic: v.optional(v.string()),
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
          v.literal("error")
        ),
        error: v.optional(v.string()),
      })
    ),
  }).index("by_user", ["userId"]),
});
