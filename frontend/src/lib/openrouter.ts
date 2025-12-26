const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length?: number
  pricing?: {
    prompt: string
    completion: string
  }
}

export interface DebateFromApi {
  id: number
  topic: string | null
  messages: any[]
  response: any
  created_at: string
}

export async function fetchModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models")
    if (!response.ok) {
      throw new Error("Failed to fetch models")
    }
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error("Error fetching models:", error)
    return []
  }
}

export async function fetchDebates(
  page = 1,
  limit = 20
): Promise<{ debates: DebateFromApi[]; pagination: any }> {
  try {
    const response = await fetch(
      `${API_URL}/debates?page=${page}&limit=${limit}`
    )
    if (!response.ok) {
      throw new Error("Failed to fetch debates")
    }
    return response.json()
  } catch (error) {
    console.error("Error fetching debates:", error)
    return { debates: [], pagination: { page, limit, total: 0, totalPages: 0 } }
  }
}

export async function fetchDebateById(
  id: number
): Promise<DebateFromApi | null> {
  try {
    const response = await fetch(`${API_URL}/debates/${id}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error("Failed to fetch debate")
    }
    return response.json()
  } catch (error) {
    console.error("Error fetching debate:", error)
    return null
  }
}

export async function saveDebate(debate: {
  topic: string
  responses: any[]
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const password = localStorage.getItem("platform_password")
    const response = await fetch(`${API_URL}/debates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify(debate),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to save debate")
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteDebateApi(id: number): Promise<boolean> {
  try {
    const password = localStorage.getItem("platform_password")
    const response = await fetch(`${API_URL}/debates/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${password}`,
      },
    })
    return response.ok
  } catch (error) {
    console.error("Error deleting debate:", error)
    return false
  }
}

export async function generateCompletion(
  model: string,
  prompt: string
): Promise<{ content: string; error?: string }> {
  try {
    const password = localStorage.getItem("platform_password")
    const response = await fetch(`${API_URL}/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        errorData.error?.message || "Failed to generate completion"
      )
    }

    const data = await response.json()
    return { content: data.choices[0].message.content }
  } catch (error: any) {
    return { content: "", error: error.message }
  }
}
