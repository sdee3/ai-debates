import { create } from "zustand"

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
  currentDebate: Debate | null
  setCurrentDebate: (debate: Debate | null) => void
  setDebates: (debates: Debate[]) => void
  addDebate: (debate: Debate) => void
  updateDebate: (id: string, updates: Partial<Debate>) => void
  getDebate: (id: string) => Debate | undefined
  deleteDebate: (id: string) => void
  addResponse: (debateId: string, response: DebateResponse) => void
  updateResponse: (
    debateId: string,
    modelId: string,
    updates: Partial<DebateResponse>
  ) => void
}

export const useDebateStore = create<DebateState>((set, get) => ({
  debates: [],
  currentDebate: null,
  setCurrentDebate: (debate) => set({ currentDebate: debate }),
  setDebates: (debates) => set({ debates }),
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
      currentDebate:
        state.currentDebate?.id === id
          ? { ...state.currentDebate, ...updates }
          : state.currentDebate,
    })),
  getDebate: (id) => get().debates.find((d) => d.id === id),
  addResponse: (debateId, response) =>
    set((state) => ({
      debates: state.debates.map((d) =>
        d.id === debateId ? { ...d, responses: [...d.responses, response] } : d
      ),
      currentDebate:
        state.currentDebate?.id === debateId
          ? {
              ...state.currentDebate,
              responses: [...state.currentDebate.responses, response],
            }
          : state.currentDebate,
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
      currentDebate:
        state.currentDebate?.id === debateId
          ? {
              ...state.currentDebate,
              responses: state.currentDebate.responses.map((r) =>
                r.modelId === modelId ? { ...r, ...updates } : r
              ),
            }
          : state.currentDebate,
    })),
}))
