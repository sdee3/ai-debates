import { action } from "./_generated/server";
import { v } from "convex/values";

const SYSTEM_PROMPT = `You are a helpful assistant participating in a debate.
Please provide your perspective on the given topic.
You must start your response with a ranking on a scale of 1 to 5, where 1 is Strongly Disagree and 5 is Strongly Agree.
Format: "RANKING: <number>" followed by a new line and then your argument.`;

export const generateCompletion = action({
  args: {
    model: v.string(),
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://debates.app",
          "X-Title": "AI Debate",
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...args.messages,
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || "OpenRouter API error");
    }

    return await response.json();
  },
});

export const fetchModels = action({
  handler: async () => {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) throw new Error("Failed to fetch models");
    const data = await response.json();
    return data.data;
  },
});
