import { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import type { Debate, DebateResponse } from "../store/useDebateStore"
import { useDebateStore } from "../store/useDebateStore"
import { useQuery } from "convex/react"
import { api } from "../../../backend/convex/_generated/api"
import { useDebateRunner } from "../hooks/useDebateRunner"
import { useModels } from "../hooks/useModels"
import { useConvexAuth } from "@convex-dev/auth/react"
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"

export default function Debate() {
  const { id } = useParams<{ id: string }>()
  const { models } = useModels()
  const { isAuthenticated } = useConvexAuth()
  const { setCurrentDebate, currentDebate } = useDebateStore()

  const isLocalUuid = !!(
    id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convexDoc = useQuery(
    api.queries.getDebate,
    isLocalUuid ? "skip" : ({ id: (id ?? "") } as any)
  )

  const debateFromConvex = useMemo((): Debate | null => {
    if (!convexDoc || !id || isLocalUuid) return null
    const modelIds = convexDoc.responses.map((r: DebateResponse) => r.modelId)
    return {
      id: convexDoc._id,
      topic: convexDoc.topic,
      modelIds: [...new Set(modelIds)],
      responses: convexDoc.responses.map((r: DebateResponse) => ({
        modelId: r.modelId,
        content: r.content,
        ranking: r.ranking,
        status: r.status,
        error: r.error,
      })),
      status: "completed",
      createdAt: convexDoc._creationTime,
    }
  }, [convexDoc, id, isLocalUuid])

  const [localLookupDone, setLocalLookupDone] = useState(false)

  useEffect(() => {
    if (isLocalUuid && id) {
      const localDebate = useDebateStore
        .getState()
        .debates.find((d) => d.id === id)
      if (localDebate) {
        setCurrentDebate(localDebate)
      }
      setLocalLookupDone(true)
      return
    }
    if (debateFromConvex) {
      setCurrentDebate(debateFromConvex)
    }
  }, [id, isLocalUuid, debateFromConvex, setCurrentDebate])

  useDebateRunner(isLocalUuid ? (id ?? "") : "")

  const showLoading =
    (isLocalUuid && !currentDebate && !localLookupDone) ||
    (!isLocalUuid && !currentDebate && convexDoc === undefined)

  const showNotFound =
    !currentDebate && (isLocalUuid ? localLookupDone : convexDoc !== undefined)

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading debate...</p>
      </div>
    )
  }

  if (showNotFound) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold">Debate Not Found</h2>
        <Link to="/" className="text-primary hover:underline">
          Return Home
        </Link>
      </div>
    )
  }

  if (!currentDebate) {
    return null
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
