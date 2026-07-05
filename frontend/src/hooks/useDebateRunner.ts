import { useEffect, useRef, useCallback } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@convex/api"
import type { Id } from "@convex/dataModel"
import { useDebateStore } from "../store/useDebateStore"
import type { DebateResponse } from "../store/useDebateStore"
import { refreshCreditsBalance } from "../lib/identitySetup"

type CompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

export function useDebateRunner(
  debateId: Id<"debates"> | null,
  ownerId: string | null | undefined,
) {
  const generateCompletion = useAction(api.actions.generateCompletion)
  const updateResponses = useMutation(api.mutations.updateResponses)
  const { setCurrentDebate, updateCurrentDebate, updateResponse } =
    useDebateStore()
  const runningRef = useRef(false)

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

  useEffect(() => {
    if (!doc || !debateId || runningRef.current) return
    if (!ownerId || doc.userId !== ownerId) return

    const hasPending = (doc.responses as DebateResponse[]).some(
      (r) => r.status === "pending",
    )
    if (!hasPending) return

    const runDebate = async () => {
      runningRef.current = true

      const responses = [...doc.responses] as DebateResponse[]
      const prompt = `Topic: "${doc.topic}"`

      const promises = responses.map(async (resp, index) => {
        if (resp.status !== "pending") return

        responses[index] = { ...resp, status: "loading" }
        updateResponse(resp.modelId, { status: "loading" })

        try {
          const data = (await generateCompletion({
            model: resp.modelId,
            messages: [{ role: "user", content: prompt }],
            debateId: doc._id,
          })) as CompletionResponse

          const content = data.choices?.[0]?.message?.content || ""
          const rankingMatch = content.match(/RANKING:\s*(\d)/i)
          let ranking = 0
          let cleanContent = content

          if (rankingMatch) {
            ranking = parseInt(rankingMatch[1], 10)
            cleanContent = content.replace(/RANKING:\s*\d\s*/i, "").trim()
          }

          responses[index] = {
            ...resp,
            content: cleanContent,
            ranking,
            status: "completed",
          }
          updateResponse(resp.modelId, {
            content: cleanContent,
            ranking,
            status: "completed",
          })
          void refreshCreditsBalance()
        } catch (err: unknown) {
          void refreshCreditsBalance()
          const message = err instanceof Error ? err.message : "Unknown error"
          responses[index] = {
            ...resp,
            status: "error",
            error: message,
          }
          updateResponse(resp.modelId, {
            status: "error",
            error: message,
          })
        }
      })

      await Promise.all(promises)

      try {
        await updateResponses({ id: doc._id, responses })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save"
        console.error("Failed to persist responses:", message)
      }

      updateCurrentDebate({ status: "completed" })
      runningRef.current = false
    }

    runDebate()
  }, [debateId, doc?._id, doc?.userId, ownerId, generateCompletion, updateResponses, updateCurrentDebate, updateResponse, doc])
}
