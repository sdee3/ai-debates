import { Hono } from "hono"
import { cors } from "hono/cors"
import { config } from "dotenv"
import { createHash } from "crypto"
import { rateLimiter } from "hono-rate-limiter"
import { RedisStore } from "@hono-rate-limiter/redis"
import {
  initDb,
  query,
  redis,
  cacheGet,
  cacheSet,
  cacheDelete,
  invalidateDebatesCache,
} from "./db"

config()

const app = new Hono()

app.use("/*", cors())

// Health check endpoint for App Runner
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const PLATFORM_PASSWORD = process.env.PLATFORM_PASSWORD

// Initialize DB
initDb().catch((err) => {
  console.error("Failed to initialize DB:", err)
})

// Rate limiter middleware
const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 50,
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "unknown",
  store: new RedisStore({
    client: redis as any,
  }),
})

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

// Helper to check auth
const requireAuth = (c: any) => {
  const authHeader = c.req.header("Authorization")
  const token = authHeader?.split(" ")[1]
  if (token !== PLATFORM_PASSWORD) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  return null
}

// Verify password endpoint
app.post("/verify-password", limiter, async (c) => {
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

// Main request endpoint with Redis caching
app.post("/request", limiter, async (c) => {
  const authError = requireAuth(c)
  if (authError) return authError

  try {
    const body = await c.req.json()
    const { model, messages } = body

    if (!model || !messages) {
      return c.json({ error: "Missing model or messages" }, 400)
    }

    // Create cache key based on request content
    const cacheKey = `api:response:${createHash("sha256")
      .update(JSON.stringify({ model, messages }))
      .digest("hex")}`

    // Try to get from cache
    const cachedResponse = await cacheGet(cacheKey)
    if (cachedResponse) {
      console.log("Cache hit for request")
      return c.json(JSON.parse(cachedResponse))
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
          error: `OpenRouter Error: ${
            errorData.error?.message || "Failed to fetch from OpenRouter"
          }`,
        },
        response.status as any
      )
    }

    const data = await response.json()

    // Cache the response
    await cacheSet(cacheKey, JSON.stringify(data))

    return c.json(data)
  } catch (error: any) {
    console.error("Error processing request:", error)
    return c.json({ error: error.message || "Internal Server Error" }, 500)
  }
})

// POST create a new debate (collection of responses)
app.post("/debates", limiter, async (c) => {
  const authError = requireAuth(c)
  if (authError) return authError

  try {
    const { topic, responses } = await c.req.json()

    if (!topic || !responses) {
      return c.json({ error: "Missing topic or responses" }, 400)
    }

    // Store debate in DB
    // We store the responses array in the 'response' column
    // We store an empty array in 'messages' to satisfy the schema
    const result = await query(
      "INSERT INTO debates (topic, messages, response) VALUES ($1, $2, $3) RETURNING id",
      [topic, "[]", JSON.stringify(responses)]
    )

    // Invalidate debates list cache
    await invalidateDebatesCache()

    return c.json({ success: true, id: result.rows[0].id })
  } catch (error: any) {
    console.error("Error saving debate:", error)
    return c.json({ error: error.message || "Internal Server Error" }, 500)
  }
})

// GET all debates (paginated)
app.get("/debates", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1")
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100)
    const offset = (page - 1) * limit

    const cacheKey = `debates:list:${page}:${limit}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached))
    }

    const [data, countResult] = await Promise.all([
      query(
        "SELECT id, topic, created_at FROM debates ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      ),
      query("SELECT COUNT(*) FROM debates"),
    ])

    const result = {
      debates: data.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    }

    // Cache for 30 seconds
    await cacheSet(cacheKey, JSON.stringify(result), 30)

    return c.json(result)
  } catch (error: any) {
    console.error("Error fetching debates:", error)
    return c.json({ error: error.message || "Internal Server Error" }, 500)
  }
})

// GET single debate by ID
app.get("/debates/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"))
    if (isNaN(id)) {
      return c.json({ error: "Invalid debate ID" }, 400)
    }

    const cacheKey = `debates:${id}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached))
    }

    const result = await query("SELECT * FROM debates WHERE id = $1", [id])

    if (result.rows.length === 0) {
      return c.json({ error: "Debate not found" }, 404)
    }

    const debate = result.rows[0]
    await cacheSet(cacheKey, JSON.stringify(debate))

    return c.json(debate)
  } catch (error: any) {
    console.error("Error fetching debate:", error)
    return c.json({ error: error.message || "Internal Server Error" }, 500)
  }
})

// DELETE a debate
app.delete("/debates/:id", async (c) => {
  const authError = requireAuth(c)
  if (authError) return authError

  try {
    const id = parseInt(c.req.param("id"))
    if (isNaN(id)) {
      return c.json({ error: "Invalid debate ID" }, 400)
    }

    const result = await query(
      "DELETE FROM debates WHERE id = $1 RETURNING id",
      [id]
    )

    if (result.rows.length === 0) {
      return c.json({ error: "Debate not found" }, 404)
    }

    // Invalidate caches
    await cacheDelete(`debates:${id}`)
    await invalidateDebatesCache()

    return c.json({ success: true, deleted: id })
  } catch (error: any) {
    console.error("Error deleting debate:", error)
    return c.json({ error: error.message || "Internal Server Error" }, 500)
  }
})

// Clear cache endpoint (admin)
app.post("/admin/clear-cache", async (c) => {
  const authError = requireAuth(c)
  if (authError) return authError

  try {
    await invalidateDebatesCache()
    return c.json({ success: true, message: "Cache cleared" })
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to clear cache" }, 500)
  }
})

export default app
