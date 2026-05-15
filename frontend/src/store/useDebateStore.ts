import { create } from "zustand"

export interface DebateResponse {
  modelId: string
  content: string
  ranking: number
  status: "pending" | "loading" | "completed" | "error"
  error?: string
}

export interface Debate {
  id: string
  topic: string
  fullTopic?: string
  modelIds: string[]
  responses: DebateResponse[]
  status: "pending" | "in-progress" | "completed"
  createdAt: number
  isPublic: boolean
  userId: string
}

interface DebateState {
  currentDebate: Debate | null
  setCurrentDebate: (debate: Debate | null) => void
  updateCurrentDebate: (updates: Partial<Debate>) => void
  updateResponse: (modelId: string, updates: Partial<DebateResponse>) => void
}

export const useDebateStore = create<DebateState>((set) => ({
  currentDebate: null,
  setCurrentDebate: (debate) => set({ currentDebate: debate }),
  updateCurrentDebate: (updates) =>
    set((state) => ({
      currentDebate: state.currentDebate
        ? { ...state.currentDebate, ...updates }
        : null,
    })),
  updateResponse: (modelId, updates) =>
    set((state) => ({
      currentDebate: state.currentDebate
        ? {
            ...state.currentDebate,
            responses: state.currentDebate.responses.map((r) =>
              r.modelId === modelId ? { ...r, ...updates } : r
            ),
          }
        : null,
    })),
}))
