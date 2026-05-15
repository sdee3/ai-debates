import { useParams, Link, useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import { useDebateStore } from "../store/useDebateStore"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex-api"
import { useDebateRunner } from "../hooks/useDebateRunner"
import { useModels } from "../hooks/useModels"
import { useConvexAuth } from "@convex-dev/auth/react"
import { ArrowLeft, Loader2, AlertTriangle, Globe, Lock, Check, Copy, Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "../lib/utils"
import { useState, useMemo } from "react"
import { SEO } from "../components/SEO"

export default function Debate() {
  const { id } = useParams<{ id: string }>()
  const { models } = useModels()
  const { isAuthenticated } = useConvexAuth()
  const { currentDebate } = useDebateStore()
  const [copied, setCopied] = useState(false)
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({})

  const navigate = useNavigate()
  const viewerId = useQuery(api.queries.viewer)
  const togglePublic = useMutation(api.mutations.togglePublicDebate)
  const deleteDebate = useMutation(api.mutations.deleteDebate)

  const doc = useQuery(
    api.queries.getDebate,
    id ? ({ id: id } as any) : "skip"
  )

  useDebateRunner(id ?? null)

  const isOwner = currentDebate && viewerId && currentDebate.userId === viewerId

  const handleTogglePublic = async () => {
    if (!id) return
    try {
      await togglePublic({ id: id as any })
    } catch (err) {
      console.error("Failed to toggle visibility:", err)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const showLoading = !currentDebate && doc === undefined

  const showNotFound = !currentDebate && doc !== undefined

  const seoTitle = currentDebate ? `Debate: ${currentDebate.topic}` : showNotFound ? "Debate Not Found" : "Loading Debate"

  const seoDescription = useMemo(() => {
    if (!currentDebate) return "Watch AI models debate and rank their agreement on this topic."
    const modelNames = currentDebate.modelIds
      .map((id) => models.find((m) => m.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ")
    return `AI models debate "${currentDebate.topic}". See how ${modelNames || "multiple AI models"} rank their agreement on this topic.`
  }, [currentDebate, models])

  const canonicalPath = id ? `/debate/${id}` : undefined

  if (showLoading) {
    return (
      <>
        <SEO title="Loading Debate" description="Loading debate..." canonical={canonicalPath} />
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading debate...</p>
        </div>
      </>
    )
  }

  if (showNotFound) {
    return (
      <>
        <SEO title="Debate Not Found" description="This debate could not be found." canonical={canonicalPath} />
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
          <h2 className="text-2xl font-bold">Debate Not Found</h2>
          <Link to="/" className="text-primary hover:underline">
            Return Home
          </Link>
        </div>
      </>
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
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalPath}
        noIndex={!currentDebate.isPublic}
      />
      {!isAuthenticated && (
        <div className="bg-secondary/50 border border-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm text-center mb-4">
          Log in to create your own thread and let AI models debate
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4 lg:flex-1 lg:min-w-0">
          {isAuthenticated && (
            <Link
              to="/"
              className="p-2 rounded-full hover:bg-secondary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <h1 className="text-2xl font-bold leading-tight break-words">
            {currentDebate.topic}
          </h1>
        </div>

        <div className="flex items-center space-x-3 self-end lg:self-auto lg:shrink-0">
          {currentDebate.isPublic ? (
            <span className="inline-flex items-center text-xs font-medium text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">
              <Globe className="w-3 h-3 mr-1" />
              Public
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
              <Lock className="w-3 h-3 mr-1" />
              Private
            </span>
          )}

          {isOwner && (
            <button
              onClick={handleTogglePublic}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                currentDebate.isPublic ? "bg-green-500" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  currentDebate.isPublic ? "translate-x-[18px]" : "translate-x-1"
                }`}
              />
            </button>
          )}

          {currentDebate.isPublic && (
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Link
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {currentDebate.fullTopic && currentDebate.fullTopic !== currentDebate.topic && (
        <div className="p-5 bg-secondary/20 border border-border/50 rounded-xl text-sm text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground/70 text-xs uppercase tracking-wider block mb-2">
            Original Topic
          </span>
          {currentDebate.fullTopic}
        </div>
      )}

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
                  <div className={cn(
                    "text-sm leading-relaxed text-muted-foreground prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-foreground prose-a:text-primary scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent pr-2",
                    expandedResponses[modelId]
                      ? "flex-1 overflow-y-auto"
                      : "max-h-[400px] overflow-hidden"
                  )}>
                    <ReactMarkdown>{response?.content || ""}</ReactMarkdown>
                  </div>
                  {!expandedResponses[modelId] && (
                    <button
                      onClick={() => setExpandedResponses(prev => ({ ...prev, [modelId]: true }))}
                      className="w-full mt-2 py-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors text-center cursor-pointer"
                    >
                      Show full response
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {isOwner && (
        <div className="border-t border-border/50 pt-6 space-y-3">
          <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Actions</h3>
          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to delete this debate?")) {
                try {
                  await deleteDebate({ id: id as any })
                  navigate("/")
                } catch (err) {
                  console.error("Failed to delete debate:", err)
                }
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Debate
          </button>
        </div>
      )}
    </div>
  )
}
