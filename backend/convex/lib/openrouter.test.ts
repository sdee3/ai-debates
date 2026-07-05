import { describe, expect, it } from "vitest"
import {
  filterTextDebateModels,
  isTextDebateModel,
  type OpenRouterModelRecord,
} from "./openrouter"

function model(
  overrides: Partial<OpenRouterModelRecord> & Pick<OpenRouterModelRecord, "id">,
): OpenRouterModelRecord {
  return {
    name: overrides.id,
    ...overrides,
  }
}

describe("isTextDebateModel", () => {
  it("accepts text-only models", () => {
    expect(
      isTextDebateModel(
        model({
          id: "anthropic/claude-sonnet-5",
          architecture: { output_modalities: ["text"] },
        }),
      ),
    ).toBe(true)
  })

  it("rejects image-only models", () => {
    expect(
      isTextDebateModel(
        model({
          id: "google/gemini-3.1-flash-image",
          architecture: { output_modalities: ["image"] },
        }),
      ),
    ).toBe(false)
  })

  it("rejects models that output both text and images", () => {
    expect(
      isTextDebateModel(
        model({
          id: "google/gemini-3.1-flash-lite-image",
          architecture: { output_modalities: ["text", "image"] },
        }),
      ),
    ).toBe(false)
  })

  it("rejects models without output modality metadata", () => {
    expect(isTextDebateModel(model({ id: "unknown/model" }))).toBe(false)
  })
})

describe("filterTextDebateModels", () => {
  it("keeps only text debate models", () => {
    const models = [
      model({
        id: "anthropic/claude-sonnet-5",
        architecture: { output_modalities: ["text"] },
      }),
      model({
        id: "google/gemini-3.1-flash-image",
        architecture: { output_modalities: ["image"] },
      }),
    ]

    expect(filterTextDebateModels(models).map((entry) => entry.id)).toEqual([
      "anthropic/claude-sonnet-5",
    ])
  })
})
