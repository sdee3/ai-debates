import { useEffect, useRef } from "react"
import { useAction, useMutation } from "convex/react"
import { api } from "../../../backend/convex/_generated/api"
import { useDebateStore } from "../store/useDebateStore"

export function useDebateRunner(debateId: string) {
  const generateCompletion = useAction(api.actions.generateCompletion)
  const createDebate = useMutation(api.mutations.createDebate)
  const { getDebate, updateDebate, addResponse, updateResponse } =
    useDebateStore()
  const debate = getDebate(debateId)
  const runningRef = useRef(false)

  useEffect(() => {
    if (!debate || debate.status !== "pending" || runningRef.current) {
      return
    }

    const runDebate = async () => {
      runningRef.current = true
      updateDebate(debateId, { status: "in-progress" })

      const prompt = `Topic: "${debate.topic}"`

      const promises = debate.modelIds.map(async (modelId: string) => {
        addResponse(debateId, {
          modelId,
          content: "",
          ranking: 0,
          status: "loading",
        })

        try {
          const data = await generateCompletion({
            model: modelId,
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

          updateResponse(debateId, modelId, {
            content: cleanContent,
            ranking,
            status: "completed",
          })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error"
          updateResponse(debateId, modelId, {
            status: "error",
            error: message,
          })
        }
      })

      await Promise.all(promises)

      const finalDebate = useDebateStore
        .getState()
        .debates.find((d) => d.id === debateId)
      if (finalDebate) {
        try {
          const convexId = await createDebate({
            topic: finalDebate.topic,
            responses: finalDebate.responses,
          })
          updateDebate(debateId, { id: convexId, status: "completed" })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to save debate"
          console.error("Failed to persist debate:", message)
          updateDebate(debateId, { status: "completed" })
        }
      } else {
        updateDebate(debateId, { status: "completed" })
      }

      runningRef.current = false
    }

    runDebate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId, debate?.status])
}
