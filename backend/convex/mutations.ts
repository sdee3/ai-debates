import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createDebate = mutation({
  args: {
    topic: v.string(),
    fullTopic: v.optional(v.string()),
    modelIds: v.array(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const responses = args.modelIds.map((modelId) => ({
      modelId,
      content: "",
      ranking: 0,
      status: "pending" as const,
    }));
    const id = await ctx.db.insert("debates", {
      userId,
      topic: args.topic,
      fullTopic: args.fullTopic,
      isPublic: args.isPublic ?? false,
      responses,
    });
    return id;
  },
});

export const togglePublicDebate = mutation({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const debate = await ctx.db.get(args.id);
    if (!debate || debate.userId !== userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { isPublic: !(debate.isPublic ?? false) });
  },
});

export const updateResponses = mutation({
  args: {
    id: v.id("debates"),
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const debate = await ctx.db.get(args.id);
    if (!debate || debate.userId !== userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { responses: args.responses });
  },
});

export const deleteDebate = mutation({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const debate = await ctx.db.get(args.id);
    if (!debate || debate.userId !== userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.id);
  },
});
