import { useEffect, useRef } from "react"
import { useDebateStore } from "../store/useDebateStore"
import { generateCompletion } from "../lib/openrouter"

export function useDebateRunner(debateId: string) {
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

      const promises = debate.modelIds.map(async (modelId) => {
        // Initialize response placeholder
        addResponse(debateId, {
          modelId,
          content: "",
          ranking: 0,
          status: "loading",
        })

        try {
          const { content, error } = await generateCompletion(modelId, prompt)

          if (error) {
            updateResponse(debateId, modelId, {
              status: "error",
              error: error,
            })
            return
          }

          // Parse ranking
          const rankingMatch = content.match(/RANKING:\s*(\d)/i)
          let ranking = 0
          let cleanContent = content

          if (rankingMatch) {
            ranking = parseInt(rankingMatch[1], 10)
            // Remove the ranking line from content
            cleanContent = content.replace(/RANKING:\s*\d\s*/i, "").trim()
          }

          updateResponse(debateId, modelId, {
            content: cleanContent,
            ranking,
            status: "completed",
          })
        } catch (err: any) {
          updateResponse(debateId, modelId, {
            status: "error",
            error: err.message || "Unknown error",
          })
        }
      })

      await Promise.all(promises)
      updateDebate(debateId, { status: "completed" })
      runningRef.current = false
    }

    runDebate()
  }, [debateId, debate?.status])
}
