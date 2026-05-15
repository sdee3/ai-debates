import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listDebates = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { page: [], continueCursor: "", isDone: true };
    }
    return await ctx.db
      .query("debates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getLatestDebates = query({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("debates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.count);
  },
});

export const getDebate = query({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    const debate = await ctx.db.get(args.id);
    if (!debate) return null;
    if (debate.isPublic ?? false) return debate;
    const userId = await getAuthUserId(ctx);
    if (userId && debate.userId === userId) return debate;
    return null;
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

export const getDebateBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const debate = await ctx.db
      .query("debates")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first()
    if (!debate) return null
    if (debate.isPublic ?? false) return debate
    const userId = await getAuthUserId(ctx)
    if (userId && debate.userId === userId) return debate
    return null
  },
})

export const listPublicDebates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("debates")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .collect();
  },
});
