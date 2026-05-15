import { action } from "./_generated/server"
import { v } from "convex/values"
import { api } from "./_generated/api"

const SYSTEM_PROMPT = `You are a helpful assistant participating in a debate.
Please provide your perspective on the given topic.
You must start your response with a ranking on a scale of 1 to 5, where 1 is Strongly Disagree and 5 is Strongly Agree.
Format: "RANKING: <number>" followed by a new line and then your argument.`

export const generateCompletion = action({
  args: {
    model: v.string(),
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-debate.sdee3.com",
          "X-Title": "AI Debate",
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...args.messages,
          ],
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || "OpenRouter API error")
    }

    return await response.json()
  },
})

export const createDebateWithSummary = action({
  args: {
    topic: v.string(),
    modelIds: v.array(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const fullTopic = args.topic
    let title = fullTopic
    try {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai-debate.sdee3.com",
            "X-Title": "AI Debate",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-v4-flash",
            messages: [
              {
                role: "system",
                content:
                  "Generate a complete, concise debate title (maximum 160 characters) that captures the core question or position. Respond with ONLY the title — no punctuation, no explanation, no formatting.",
              },
              { role: "user", content: fullTopic },
            ],
          }),
        },
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || "OpenRouter API error")
      }

      const data = await response.json()
      const summary = data.choices?.[0]?.message?.content?.trim() || ""
      title = summary.substring(0, 160)
    } catch (err) {
      console.warn("Failed to summarize topic, using original:", err)
    }

    return await ctx.runMutation(api.mutations.createDebate, {
      topic: title,
      fullTopic,
      modelIds: args.modelIds,
      isPublic: args.isPublic,
    })
  },
})

export const fetchModels = action({
  handler: async () => {
    const response = await fetch("https://openrouter.ai/api/v1/models")
    if (!response.ok) throw new Error("Failed to fetch models")
    const data = await response.json()
    return data.data
  },
})
