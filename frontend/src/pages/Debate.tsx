import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import type { Debate } from "../store/useDebateStore"
import { useDebateStore } from "../store/useDebateStore"
import type { DebateFromApi } from "../lib/openrouter"
import { fetchDebateById } from "../lib/openrouter"
import { useDebateRunner } from "../hooks/useDebateRunner"
import { useModels } from "../hooks/useModels"
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"

function convertApiDebateToDebate(apiDebate: DebateFromApi): Debate {
  const response =
    typeof apiDebate.response === "string"
      ? JSON.parse(apiDebate.response)
      : apiDebate.response

  // Check if it's the new format (Array of responses)
  if (Array.isArray(response)) {
    const responses = response as Debate["responses"]
    const modelIds = responses.map((r) => r.modelId)
    // Deduplicate modelIds
    const uniqueModelIds = [...new Set(modelIds)]

    return {
      id: String(apiDebate.id),
      topic: apiDebate.topic || "Unknown Topic",
      modelIds: uniqueModelIds,
      responses,
      status: "completed",
      createdAt: new Date(apiDebate.created_at).getTime(),
    }
  }

  const modelIds: string[] = []
  const responses: Debate["responses"] = []

  if (response && response.choices && response.choices.length > 0) {
    const modelId = response.model || "unknown"
    if (!modelIds.includes(modelId)) {
      modelIds.push(modelId)
    }

    response.choices.forEach((choice: { message?: { content?: string } }) => {
      const content = choice.message?.content || ""
      const rankingMatch = content.match(/RANKING:\s*(\d)/i)
      let ranking = 0
      let cleanContent = content

      if (rankingMatch) {
        ranking = parseInt(rankingMatch[1], 10)
        cleanContent = content.replace(/RANKING:\s*\d\s*/i, "").trim()
      }

      responses.push({
        modelId,
        content: cleanContent,
        ranking,
        status: "completed",
      })
    })
  }

  return {
    id: String(apiDebate.id),
    topic: apiDebate.topic || "Unknown Topic",
    modelIds,
    responses,
    status: "completed",
    createdAt: new Date(apiDebate.created_at).getTime(),
  }
}

export default function Debate() {
  const { id } = useParams<{ id: string }>()
  const { models } = useModels()
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true"
  const { setCurrentDebate, currentDebate } = useDebateStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    // First check if it's a local debate (UUID format)
    if (
      id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      const localDebate = useDebateStore
        .getState()
        .debates.find((d) => d.id === id)
      if (localDebate) {
        setCurrentDebate(localDebate)
        setLoading(false)
        return
      }
    }

    // If not found locally, try to load from backend
    const loadDebate = async () => {
      if (!id) return

      setLoading(true)
      setError(null)

      try {
        // Fetch from backend
        const apiDebate = await fetchDebateById(id)
        if (apiDebate) {
          const debate = convertApiDebateToDebate(apiDebate)
          setCurrentDebate(debate)
        } else {
          setError("Debate not found")
        }
      } catch (err) {
        console.error("Failed to load debate:", err)
        setError("Failed to load debate")
      } finally {
        setLoading(false)
      }
    }

    loadDebate()
  }, [id, setCurrentDebate])

  // Run the debate logic for local debates (not yet in DB)
  useDebateRunner(id || "")

  // Check if we're viewing a different debate than what's in the store
  const isDebateMismatch = currentDebate && currentDebate.id !== id

  if (loading || isDebateMismatch) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading debate...</p>
      </div>
    )
  }

  if (error || !currentDebate) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold">Debate Not Found</h2>
        <Link to="/" className="text-primary hover:underline">
          Return Home
        </Link>
      </div>
    )
  }

  const getModelName = (modelId: string) => {
    return models.find((m) => m.id === modelId)?.name || modelId
  }

  const getRankingColor = (ranking: number) => {
    if (ranking <= 2) return "bg-red-500"
    if (ranking === 3) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getRankingLabel = (ranking: number) => {
    if (ranking === 1) return "Strongly Disagree"
    if (ranking === 2) return "Disagree"
    if (ranking === 3) return "Neutral"
    if (ranking === 4) return "Agree"
    if (ranking === 5) return "Strongly Agree"
    return "Unknown"
  }

  return (
    <div className="space-y-8 pb-12">
      {!isAuthenticated && (
        <div className="bg-secondary/50 border border-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm text-center mb-4">
          Log in to create your own thread and let AI models debate
        </div>
      )}
      <div className="flex items-center space-x-4">
        {isAuthenticated && (
          <Link
            to="/"
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <h1 className="text-2xl font-bold leading-tight">
          {currentDebate.topic}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentDebate.modelIds.map((modelId, index) => {
          const response = currentDebate.responses.find(
            (r) => r.modelId === modelId
          )
          const isLoading =
            !response ||
            response.status === "loading" ||
            response.status === "pending"
          const isError = response?.status === "error"

          return (
            <motion.div
              key={modelId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col h-full p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 hover:border-primary/20"
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                <h3
                  className="font-semibold text-lg truncate text-foreground/90"
                  title={getModelName(modelId)}
                >
                  {getModelName(modelId)}
                </h3>
                {isLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                {isError && (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                )}
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm space-y-3 min-h-[200px]">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <span className="animate-pulse">
                    Formulating arguments...
                  </span>
                </div>
              ) : isError ? (
                <div className="flex-1 flex items-center justify-center text-destructive text-sm bg-destructive/5 rounded-lg p-4">
                  {response?.error || "Failed to generate response"}
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-center justify-between text-sm bg-secondary/30 p-2 rounded-lg">
                    <span className="font-medium text-muted-foreground">
                      Verdict
                    </span>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm",
                        getRankingColor(response?.ranking || 0)
                      )}
                    >
                      {getRankingLabel(response?.ranking || 0)}
                    </span>
                  </div>
                  <div className="flex-1 text-sm leading-relaxed text-muted-foreground overflow-y-auto prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-foreground prose-a:text-primary scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent pr-2">
                    <ReactMarkdown>{response?.content || ""}</ReactMarkdown>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
