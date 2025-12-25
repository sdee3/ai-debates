import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface DebateResponse {
  modelId: string
  content: string
  ranking: number // 1 (Strongly Disagree) to 5 (Strongly Agree)
  status: "pending" | "loading" | "completed" | "error"
  error?: string
}

export interface Debate {
  id: string
  topic: string
  modelIds: string[]
  responses: DebateResponse[]
  status: "pending" | "in-progress" | "completed"
  createdAt: number
}

interface DebateState {
  debates: Debate[]
  addDebate: (debate: Debate) => void
  updateDebate: (id: string, updates: Partial<Debate>) => void
  getDebate: (id: string) => Debate | undefined
  addResponse: (debateId: string, response: DebateResponse) => void
  updateResponse: (
    debateId: string,
    modelId: string,
    updates: Partial<DebateResponse>
  ) => void
  deleteDebate: (id: string) => void
}

export const useDebateStore = create<DebateState>()(
  persist(
    (set, get) => ({
      debates: [],
      addDebate: (debate) =>
        set((state) => ({ debates: [debate, ...state.debates] })),
      deleteDebate: (id) =>
        set((state) => ({
          debates: state.debates.filter((d) => d.id !== id),
        })),
      updateDebate: (id, updates) =>
        set((state) => ({
          debates: state.debates.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),
      getDebate: (id) => get().debates.find((d) => d.id === id),
      addResponse: (debateId, response) =>
        set((state) => ({
          debates: state.debates.map((d) =>
            d.id === debateId
              ? { ...d, responses: [...d.responses, response] }
              : d
          ),
        })),
      updateResponse: (debateId, modelId, updates) =>
        set((state) => ({
          debates: state.debates.map((d) =>
            d.id === debateId
              ? {
                  ...d,
                  responses: d.responses.map((r) =>
                    r.modelId === modelId ? { ...r, ...updates } : r
                  ),
                }
              : d
          ),
        })),
    }),
    {
      name: "debate-storage",
    }
  )
)
