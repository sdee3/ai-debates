import { serve } from "@hono/node-server"
import app from "./app"
import { closeConnections } from "./db"

const port = parseInt(process.env.PORT || "3000", 10)
console.log(`Server is running on port ${port}`)

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`)
  try {
    await closeConnections()
    console.log("Connections closed successfully")
    process.exit(0)
  } catch (error) {
    console.error("Error during shutdown:", error)
    process.exit(1)
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

serve({
  fetch: app.fetch,
  port,
})
