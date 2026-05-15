import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

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
    const { topic, fullTopic } = validateAndSanitizeTopic(args.topic, args.fullTopic);
    const responses = args.modelIds.map((modelId) => ({
      modelId,
      content: "",
      ranking: 0,
      status: "pending" as const,
    }));
    const id = await ctx.db.insert("debates", {
      userId,
      topic,
      fullTopic,
      isPublic: args.isPublic ?? false,
      responses,
    });
    const slug = `${topic.slice(0, 40).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}-${id}`
    await ctx.db.patch(id, { slug })
    await ctx.runMutation(api.audit.logAuditEvent, { action: "debate.created", debateId: id });
    return { id, slug };
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
    const newVisibility = !(debate.isPublic ?? false);
    await ctx.db.patch(args.id, { isPublic: newVisibility });
    await ctx.runMutation(api.audit.logAuditEvent, { action: "debate.visibility_toggled", debateId: args.id, details: String(newVisibility) });
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
    await ctx.runMutation(api.audit.logAuditEvent, { action: "debate.responses_updated", debateId: args.id });
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
    await ctx.runMutation(api.audit.logAuditEvent, { action: "debate.deleted", debateId: args.id });
  },
});
