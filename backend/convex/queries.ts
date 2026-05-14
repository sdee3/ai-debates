import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const listDebates = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("debates")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getDebate = query({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
