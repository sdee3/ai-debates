import { useEffect, useCallback, useRef } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/api"
import type { Id } from "@convex/dataModel"
import { useDebateStore } from "../store/useDebateStore"
import type { DebateResponse } from "../store/useDebateStore"
import { refreshCreditsBalance } from "../lib/identitySetup"

/**
 * useDebateRunner is a READ-ONLY sync from the Convex debate document into the
 * local UI store. It never calls actions or mutations.
 *
 * Debate generation is fully backend-driven: `createDebate` schedules
 * `runDebateResponses` (an internal action) which persists results via
 * `setDebateResponse`. Page refreshes simply re-read the document and render
 * whatever state the backend has produced — they can never trigger or alter
 * generation.
 */
export function useDebateRunner(debateId: Id<"debates"> | null) {
  const { setCurrentDebate } = useDebateStore()
  const creditedRef = useRef(false)

  const doc = useQuery(
    api.queries.getDebate,
    debateId ? { id: debateId } : "skip",
  )

  const syncToStore = useCallback(() => {
    if (!doc) return
    const responses = doc.responses as DebateResponse[]
    const modelIds = responses.map((r) => r.modelId)
    setCurrentDebate({
      id: doc._id,
      topic: doc.topic,
      fullTopic: doc.fullTopic,
      modelIds: [...new Set(modelIds)],
      responses: responses.map((r) => ({
        modelId: r.modelId,
        content: r.content,
        ranking: r.ranking,
        status: r.status,
        error: r.error,
      })),
      status:
        responses.every((r) => r.status === "completed" || r.status === "error")
          ? "completed"
          : responses.some((r) => r.status === "loading")
            ? "in-progress"
            : "pending",
      createdAt: doc._creationTime,
      isPublic: doc.isPublic ?? false,
      userId: doc.userId,
    })
  }, [doc, setCurrentDebate])

  useEffect(() => {
    syncToStore()
  }, [syncToStore])

  // Credits refresh is read-only (pulls latest balance from Identity) and does
  // not touch debate state. Fire it once when the run finishes.
  const finished =
    !!doc &&
    (doc.responses as DebateResponse[]).every(
      (r) => r.status === "completed" || r.status === "error",
    )
  useEffect(() => {
    if (!finished || creditedRef.current) return
    creditedRef.current = true
    void refreshCreditsBalance()
  }, [finished])
}