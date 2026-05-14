import { useEffect, useMemo } from "react"
import type { Debate, DebateResponse } from "../store/useDebateStore"
import { useDebateStore } from "../store/useDebateStore"
import { usePaginatedQuery, useMutation } from "convex/react"
import { api } from "../../../backend/convex/_generated/api"
import { HeroSection } from "../components/HeroSection"
import { DebateList } from "../components/DebateList"
import { Loader2 } from "lucide-react"

interface ConvexDebateDoc {
  _id: string
  _creationTime: number
  topic: string
  responses: Array<DebateResponse>
}

function convertConvexDocToDebate(doc: ConvexDebateDoc): Debate {
  const modelIds = doc.responses.map((r) => r.modelId)
  const uniqueModelIds: string[] = [...new Set(modelIds)]

  return {
    id: doc._id,
    topic: doc.topic,
    modelIds: uniqueModelIds,
    responses: doc.responses.map((r) => ({
      modelId: r.modelId,
      content: r.content,
      ranking: r.ranking,
      status: r.status,
      error: r.error,
    })),
    status: "completed",
    createdAt: doc._creationTime,
  }
}

export default function Home() {
  const { debates, setDebates, deleteDebate } = useDebateStore()
  const deleteDebateMutation = useMutation(api.mutations.deleteDebate)
  const { results, status, loadMore } = usePaginatedQuery(
    api.queries.listDebates,
    { paginationOpts: { numItems: 20 } },
    { initialNumItems: 20 }
  )

  const convexDebates = useMemo(
    () => (results ?? []).map(convertConvexDocToDebate),
    [results]
  )

  useEffect(() => {
    const currentDebates = useDebateStore.getState().debates
    const inProgressDebates = currentDebates.filter(
      (d) => d.status !== "completed"
    )
    const uniqueInProgress = inProgressDebates.filter(
      (local) => !convexDebates.find((remote) => remote.id === local.id)
    )
    setDebates([...uniqueInProgress, ...convexDebates])
  }, [convexDebates, setDebates])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm("Are you sure you want to delete this debate?")) {
      deleteDebate(id)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await deleteDebateMutation({ id: id as any })
      } catch {
        console.log("Could not delete from backend (might be local-only)")
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
