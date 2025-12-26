import { useEffect, useState } from "react"
import type { Debate } from "../store/useDebateStore"
import { useDebateStore } from "../store/useDebateStore"
import type { DebateFromApi } from "../lib/openrouter"
import { fetchDebates, deleteDebateApi } from "../lib/openrouter"
import { HeroSection } from "../components/HeroSection"
import { DebateList } from "../components/DebateList"
import { Loader2 } from "lucide-react"

function convertApiDebateToDebate(apiDebate: DebateFromApi): Debate {
  // Parse the stored response
  const response =
    typeof apiDebate.response === "string"
      ? JSON.parse(apiDebate.response)
      : apiDebate.response

  // Check if it's the new format (Array of responses)
  if (Array.isArray(response)) {
    const responses = response as Debate["responses"]
    const modelIds = responses.map((r) => r.modelId)
    // Deduplicate modelIds
    const uniqueModelIds = [...new Set(modelIds)]

    return {
      id: String(apiDebate.id),
      topic: apiDebate.topic || "Unknown Topic",
      modelIds: uniqueModelIds,
      responses,
      status: "completed",
      createdAt: new Date(apiDebate.created_at).getTime(),
    }
  }

  // Extract model IDs and responses from the stored data
  const modelIds: string[] = []
  const responses: Debate["responses"] = []

  // The response contains the API response with choices
  if (response && response.choices && response.choices.length > 0) {
    const modelId = response.model || "unknown"
    if (!modelIds.includes(modelId)) {
      modelIds.push(modelId)
    }

    response.choices.forEach((choice: { message?: { content?: string } }) => {
      const content = choice.message?.content || ""
      const rankingMatch = content.match(/RANKING:\s*(\d)/i)
      let ranking = 0
      let cleanContent = content

      if (rankingMatch) {
        ranking = parseInt(rankingMatch[1], 10)
        cleanContent = content.replace(/RANKING:\s*\d\s*/i, "").trim()
      }

      responses.push({
        modelId,
        content: cleanContent,
        ranking,
        status: "completed",
      })
    })
  }

  return {
    id: String(apiDebate.id),
    topic: apiDebate.topic || "Unknown Topic",
    modelIds,
    responses,
    status: "completed",
    createdAt: new Date(apiDebate.created_at).getTime(),
  }
}

export default function Home() {
  const { debates, setDebates, deleteDebate } = useDebateStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDebates = async () => {
      setLoading(true)
      try {
        const { debates: apiDebates } = await fetchDebates()
        const converted = apiDebates.map(convertApiDebateToDebate)
        setDebates(converted)
      } catch (error) {
        console.error("Failed to load debates:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDebates()
  }, [setDebates])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm("Are you sure you want to delete this debate?")) {
      // Optimistically delete from store
      deleteDebate(id)

      // Delete from backend if it's a saved debate (numeric ID)
      const numericId = parseInt(id, 10)
      if (!isNaN(numericId)) {
        const success = await deleteDebateApi(numericId)
        if (!success) {
          console.error("Failed to delete debate from backend")
        }
      }
    }
  }

  if (loading) {
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
    </div>
  )
}
