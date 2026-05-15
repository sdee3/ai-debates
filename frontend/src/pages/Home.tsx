import { useState, useMemo } from "react"
import type { DebateResponse } from "../store/useDebateStore"
import { useQuery, usePaginatedQuery, useMutation } from "convex/react"
import { api } from "@convex-api"
import { HeroSection } from "../components/HeroSection"
import { DebateList } from "../components/DebateList"
import { SEO } from "../components/SEO"
import { Loader2 } from "lucide-react"

interface ConvexDebateDoc {
  _id: string
  _creationTime: number
  topic: string
  responses: Array<DebateResponse>
  isPublic: boolean
  userId: string
}

function deriveDebateStatus(responses: Array<DebateResponse>): "pending" | "in-progress" | "completed" {
  if (responses.every((r) => r.status === "completed" || r.status === "error"))
    return "completed"
  if (responses.some((r) => r.status === "loading"))
    return "in-progress"
  return "pending"
}

function convertConvexDocToDebate(doc: ConvexDebateDoc) {
  const modelIds = doc.responses.map((r) => r.modelId)
  return {
    id: doc._id,
    topic: doc.topic,
    modelIds: [...new Set(modelIds)],
    responses: doc.responses.map((r) => ({
      modelId: r.modelId,
      content: r.content,
      ranking: r.ranking,
      status: r.status,
      error: r.error,
    })),
    status: deriveDebateStatus(doc.responses as DebateResponse[]),
    createdAt: doc._creationTime,
    isPublic: doc.isPublic,
    userId: doc.userId,
  }
}

function useLatestDebates() {
  return useQuery(api.queries.getLatestDebates, { count: 3 })
}

function useAllDebates() {
  return usePaginatedQuery(
    api.queries.listDebates,
    {},
    { initialNumItems: 20 }
  )
}

export default function Home() {
  const [showAll, setShowAll] = useState(false)
  const deleteDebateMutation = useMutation(api.mutations.deleteDebate)

  const latestDebates = useLatestDebates()
  const { results, status, loadMore } = useAllDebates()

  const debates = useMemo(() => {
    if (showAll) {
      return (results ?? []).map(convertConvexDocToDebate)
    }
    return (latestDebates ?? []).map(convertConvexDocToDebate)
  }, [showAll, results, latestDebates])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm("Are you sure you want to delete this debate?")) {
      try {
        await deleteDebateMutation({ id: id as any })
      } catch (err: unknown) {
        console.error("Failed to delete debate:", err)
      }
    }
  }

  if (!showAll && latestDebates === undefined) {
    return (
      <div className="flex flex-col items-center min-h-[80vh] space-y-24 py-12">
        <SEO
          title="Home"
          description="Watch multiple AI language models debate any topic, then rank their agreement. Create public or private debates."
        />
        <HeroSection />
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (showAll && status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col items-center min-h-[80vh] space-y-24 py-12">
        <SEO
          title="All Debates"
          description="Browse all AI debates. Watch multiple AI language models debate any topic and rank their agreement."
        />
        <HeroSection />
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-[80vh] space-y-24 py-12">
      <SEO
        title={showAll ? "All Debates" : "Home"}
        description="Watch multiple AI language models debate any topic, then rank their agreement. Create public or private debates with models like GPT, Claude, Gemini, and more."
      />
      <HeroSection />
      <DebateList
        debates={debates}
        onDelete={handleDelete}
        showAll={showAll}
        onShowAll={() => setShowAll(true)}
      />
      {showAll && status === "CanLoadMore" && (
        <button
          onClick={() => loadMore(20)}
          className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          Load more debates
        </button>
      )}
    </div>
  )
}
