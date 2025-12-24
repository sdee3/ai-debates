import { Hono } from "hono"
import { cors } from "hono/cors"
import { config } from "dotenv"

config()

const app = new Hono()

app.use("/*", cors())

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const PLATFORM_PASSWORD = process.env.PLATFORM_PASSWORD

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; lastAttempt: number }>()

const checkRateLimit = (ip: string) => {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const limit = 5

  const record = rateLimitMap.get(ip)
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastAttempt: now })
    return true
  }

  if (now - record.lastAttempt > windowMs) {
    // Reset if window passed
    rateLimitMap.set(ip, { count: 1, lastAttempt: now })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

const SYSTEM_PROMPT = `You are a helpful assistant participating in a debate.
Please provide your perspective on the given topic.
You must start your response with a ranking on a scale of 1 to 5, where 1 is Strongly Disagree and 5 is Strongly Agree.
Format: "RANKING: <number>" followed by a new line and then your argument.
Example:
RANKING: 4
I agree with this because...`

if (!OPENROUTER_API_KEY) {
  console.warn(
    "Warning: OPENROUTER_API_KEY is not set in environment variables."
  )
}

if (!PLATFORM_PASSWORD) {
  console.warn(
    "Warning: PLATFORM_PASSWORD is not set in environment variables."
  )
}

app.post("/verify-password", async (c) => {
  const ip = c.req.header("x-forwarded-for") || "unknown"

  if (!checkRateLimit(ip)) {
    return c.json(
      { error: "Too many attempts. Please try again in a minute." },
      429
    )
  }

  try {
    const { password } = await c.req.json()

    if (password === PLATFORM_PASSWORD) {
      return c.json({ success: true })
    }

    return c.json({ error: "Incorrect password" }, 401)
  } catch {
    return c.json({ error: "Invalid request" }, 400)
  }
})

app.post("/request", async (c) => {
  try {
    const body = await c.req.json()
    const { model, messages } = body

    if (!model || !messages) {
      return c.json({ error: "Missing model or messages" }, 400)
    }

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ]

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": c.req.header("Host") || "http://localhost:5137",
          "X-Title": "AI Debate",
        },
        body: JSON.stringify({
          model: model,
          messages: finalMessages,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return c.json(
        {
          error: errorData.error?.message || "Failed to fetch from OpenRouter",
        },
        response.status as any
      )
    }

    const data = await response.json()
    return c.json(data)
  } catch (error: any) {
    console.error("Error processing request:", error)
    return c.json({ error: error.message || "Internal Server Error" }, 500)
  }
})

export default app
