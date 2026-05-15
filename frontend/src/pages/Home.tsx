import { useMemo } from "react"
import type { DebateResponse } from "../store/useDebateStore"
import { usePaginatedQuery, useMutation } from "convex/react"
import { api } from "@convex-api"
import { HeroSection } from "../components/HeroSection"
import { DebateList } from "../components/DebateList"
import { Loader2 } from "lucide-react"

interface ConvexDebateDoc {
  _id: string
  _creationTime: number
  topic: string
  responses: Array<DebateResponse>
  isPublic: boolean
  userId: string
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
    status: "completed" as const,
    createdAt: doc._creationTime,
    isPublic: doc.isPublic,
    userId: doc.userId,
  }
}

export default function Home() {
  const deleteDebateMutation = useMutation(api.mutations.deleteDebate)
  const { results, status, loadMore } = usePaginatedQuery(
    api.queries.listDebates,
    {},
    { initialNumItems: 20 }
  )

  const debates = useMemo(
    () => (results ?? []).map(convertConvexDocToDebate),
    [results]
  )

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

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col items-center min-h-[80vh] space-y-24 py-12">
        <HeroSection />
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-[80vh] space-y-24 py-12">
      <HeroSection />
      <DebateList debates={debates} onDelete={handleDelete} />
      {status === "CanLoadMore" && (
        <button
          onClick={() => loadMore(20)}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Load more debates
        </button>
      )}
    </div>
  )
}
