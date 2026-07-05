export type OpenRouterModelArchitecture = {
  output_modalities?: string[]
}

export type OpenRouterModelRecord = {
  id: string
  name: string
  architecture?: OpenRouterModelArchitecture
}

/** Debates only needs chat models that produce text, not image generation. */
export function isTextDebateModel(model: OpenRouterModelRecord): boolean {
  const modalities = model.architecture?.output_modalities
  if (!modalities?.length) return false
  return modalities.includes("text") && !modalities.includes("image")
}

export function filterTextDebateModels<T extends OpenRouterModelRecord>(
  models: T[],
): T[] {
  return models.filter(isTextDebateModel)
}
