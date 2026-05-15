import { useEffect, useRef, useCallback } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@convex-api"
import { useDebateStore } from "../store/useDebateStore"
import type { DebateResponse } from "../store/useDebateStore"

export function useDebateRunner(debateId: string | null) {
  const generateCompletion = useAction(api.actions.generateCompletion)
  const updateResponses = useMutation(api.mutations.updateResponses)
  const { setCurrentDebate, updateCurrentDebate, updateResponse } =
    useDebateStore()
  const runningRef = useRef(false)

  const doc = useQuery(
    api.queries.getDebate,
    debateId ? ({ id: debateId } as any) : "skip"
  )

  const syncToStore = useCallback(() => {
    if (!doc) return
    const responses = doc.responses as DebateResponse[]
    const modelIds = responses.map((r) => r.modelId)
    setCurrentDebate({
      id: doc._id,
      topic: doc.topic,
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

    const hasPending = (doc.responses as DebateResponse[]).some(
      (r) => r.status === "pending"
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
          const data = await generateCompletion({
            model: resp.modelId,
            messages: [{ role: "user", content: prompt }],
          })

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
        } catch (err: unknown) {
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
        await updateResponses({ id: debateId as any, responses })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save"
        console.error("Failed to persist responses:", message)
      }

      updateCurrentDebate({ status: "completed" })
      runningRef.current = false
    }

    runDebate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId, doc?._id])
}
