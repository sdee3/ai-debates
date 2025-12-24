import { useState, useEffect } from "react"
import { fetchModels, type OpenRouterModel } from "../lib/openrouter"

export function useModels() {
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
      } catch (err) {
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
  }, [])

  return { models, loading, error }
}
