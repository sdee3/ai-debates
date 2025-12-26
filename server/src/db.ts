import { Pool } from "pg"
import Redis from "ioredis"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Redis client
export const redis = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
)

// Add scriptLoad and evalsha methods for @hono-rate-limiter/redis compatibility
;(redis as any).scriptLoad = async (script: string) => {
  return await redis.call("SCRIPT", "LOAD", script)
}
;(redis as any).evalsha = async (sha1: string, keys: string[], args: any[]) => {
  return await redis.call("EVALSHA", sha1, keys.length, ...keys, ...args)
}

// Cache configuration
const CACHE_TTL = 60 * 5 // 5 minutes

export const query = (text: string, params?: any[]) => pool.query(text, params)

export const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debates (
      id SERIAL PRIMARY KEY,
      topic TEXT,
      messages JSONB NOT NULL,
      response JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

// Redis cache helpers
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redis.get(key)
  } catch (error) {
    console.error("Redis GET error:", error)
    return null
  }
}

export const cacheSet = async (
  key: string,
  value: string,
  ttl?: number
): Promise<void> => {
  try {
    await redis.setex(key, ttl || CACHE_TTL, value)
  } catch (error) {
    console.error("Redis SET error:", error)
  }
}

export const cacheDelete = async (key: string): Promise<void> => {
  try {
    await redis.del(key)
  } catch (error) {
    console.error("Redis DEL error:", error)
  }
}

export const invalidateDebatesCache = async (): Promise<void> => {
  try {
    const keys = await redis.keys("debates:*")
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error("Redis invalidate error:", error)
  }
}

// Graceful shutdown
export const closeConnections = async () => {
  await pool.end()
  await redis.quit()
}
