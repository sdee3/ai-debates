import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireClerkUserId } from "./lib/auth";

const COOLDOWN_MS = 10_000;

export const checkRateLimit = mutation({
  args: { action: v.string() },
  handler: async (ctx, args) => {
    const clerkUserId = await requireClerkUserId(ctx);
    const now = Date.now();
    const record = await ctx.db
      .query("debateRateLimits")
      .withIndex("by_user_action", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("action", args.action),
      )
      .first();
    if (record && now - record.lastInvokedAt < COOLDOWN_MS) {
      const remaining = Math.ceil(
        (COOLDOWN_MS - (now - record.lastInvokedAt)) / 1000,
      );
      throw new Error(`Rate limited. Try again in ${remaining} seconds.`);
    }
    if (record) {
      await ctx.db.patch(record._id, { lastInvokedAt: now });
    } else {
      await ctx.db.insert("debateRateLimits", {
        clerkUserId,
        action: args.action,
        lastInvokedAt: now,
      });
    }
  },
});
