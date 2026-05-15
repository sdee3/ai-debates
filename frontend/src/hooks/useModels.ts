import { useAction } from "convex/react"
import type { OpenRouterModel } from "../lib/openrouter"
import { api } from "@convex-api"
import { useState, useEffect } from "react"

export function useModels() {
  const fetchModels = useAction(api.actions.fetchModels)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadModels() {
      try {
        const data = await fetchModels()
        if (mounted) {
          setModels(data)
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setError("Failed to load models")
          setLoading(false)
        }
      }
    }

    loadModels()

    return () => {
      mounted = false
    }
  }, [fetchModels])

  return { models, loading, error }
}
