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

export async function generateCompletion(
  model: string,
  prompt: string
): Promise<{ content: string; error?: string }> {
  try {
    const password = localStorage.getItem("platform_password")
    const response = await fetch("http://localhost:3000/request", {
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
