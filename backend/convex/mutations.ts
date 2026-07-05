import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireClerkUserId } from "./lib/auth";
import { logAuditFromMutation } from "./lib/auditLog";

function sanitizeHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

function validateAndSanitizeTopic(topic: string, fullTopic?: string): { topic: string; fullTopic?: string } {
  const cleanTopic = sanitizeHtml(topic).trim();
  const cleanFullTopic = fullTopic ? sanitizeHtml(fullTopic).trim() : undefined;
  if (!cleanTopic) throw new Error("Topic cannot be empty");
  if (cleanTopic.length > 5000) throw new Error("Topic exceeds 5000 character limit");
  if (cleanFullTopic && cleanFullTopic.length > 50000) throw new Error("Full topic exceeds 50000 character limit");
  return { topic: cleanTopic, fullTopic: cleanFullTopic };
}

export const createDebate = internalMutation({
  args: {
    topic: v.string(),
    fullTopic: v.optional(v.string()),
    modelIds: v.array(v.string()),
    isPublic: v.optional(v.boolean()),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const { topic, fullTopic } = validateAndSanitizeTopic(args.topic, args.fullTopic);
    const responses = args.modelIds.map((modelId) => ({
      modelId,
      content: "",
      ranking: 0,
      status: "loading" as const,
    }));
    const id = await ctx.db.insert("debates", {
      userId: args.clerkUserId,
      topic,
      fullTopic,
      isPublic: args.isPublic ?? false,
      responses,
    });
    const slug = `${topic.slice(0, 40).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}-${id}`
    await ctx.db.patch(id, { slug })
    await logAuditFromMutation(ctx, {
      action: "debate.created",
      userId: args.clerkUserId,
      debateId: id,
    });
    // Backend owns response generation: schedule the LLM run so the frontend
    // can never trigger or re-trigger completions, regardless of refreshes.
    await ctx.scheduler.runAfter(0, internal.actions.runDebateResponses, {
      debateId: id,
      clerkUserId: args.clerkUserId,
    });
    return { id, slug };
  },
});

export const setDebateResponse = internalMutation({
  args: {
    debateId: v.id("debates"),
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
  },
  handler: async (ctx, args) => {
    const debate = await ctx.db.get(args.debateId);
    if (!debate) {
      throw new Error("Debate not found");
    }
    const responses = debate.responses.map((r) =>
      r.modelId === args.modelId
        ? {
            ...r,
            content: args.content,
            ranking: args.ranking,
            status: args.status,
            error: args.error,
          }
        : r,
    );
    await ctx.db.patch(args.debateId, { responses });
  },
});

export const togglePublicDebate = mutation({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const debate = await ctx.db.get(args.id);
    if (!debate || debate.userId !== userId) {
      throw new Error("Not authorized");
    }
    const newVisibility = !(debate.isPublic ?? false);
    await ctx.db.patch(args.id, { isPublic: newVisibility });
    await logAuditFromMutation(ctx, {
      action: "debate.visibility_toggled",
      userId,
      debateId: args.id,
      details: String(newVisibility),
    });
  },
});

export const deleteDebate = mutation({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const debate = await ctx.db.get(args.id);
    if (!debate || debate.userId !== userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.id);
    await logAuditFromMutation(ctx, {
      action: "debate.deleted",
      userId,
      debateId: args.id,
    });
  },
});
