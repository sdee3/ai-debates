import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createDebate = mutation({
  args: {
    topic: v.string(),
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
    const id = await ctx.db.insert("debates", {
      userId,
      topic: args.topic,
      responses: args.responses,
    });
    return id;
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
