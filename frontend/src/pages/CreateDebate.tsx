import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useModels } from "../hooks/useModels"
import { useDebateStore } from "../store/useDebateStore"
import ModelSelector from "../components/ModelSelector"
import { Loader2, AlertCircle } from "lucide-react"
import { cn } from "../lib/utils"

const POPULAR_MODELS = [
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash" },
  { id: "openai/gpt-5.2-chat", name: "GPT 5.2 Chat" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  { id: "moonshotai/kimi-k2-thinking", name: "Kimi K2 Thinking" },
  { id: "deepseek/deepseek-v3.2", name: "Deepseek V3.2" },
]

export default function CreateDebate() {
  const navigate = useNavigate()
  const { models, loading, error } = useModels()
  const { addDebate } = useDebateStore()

  const availableModels = [...models]
  POPULAR_MODELS.forEach((pop) => {
    if (!availableModels.find((m) => m.id === pop.id)) {
      availableModels.push(pop)
    }
  })

  const [topic, setTopic] = useState("")
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleCreate = () => {
    if (!topic.trim()) {
      setValidationError("Please enter a topic.")
      return
    }
    if (selectedModels.length === 0) {
      setValidationError("Please select at least 1 model.")
      return
    }

    const id = crypto.randomUUID()
    addDebate({
      id,
      topic,
      modelIds: selectedModels,
      responses: [],
      status: "pending",
      createdAt: Date.now(),
    })

    navigate(`/debate/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-destructive">
        <AlertCircle className="w-6 h-6 mr-2" />
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Create New Debate</h1>
        <p className="text-lg text-muted-foreground">
          Define a topic and select AI models to debate it.
        </p>
      </div>

      <div className="space-y-8 bg-card/50 p-8 rounded-2xl border border-border/50 shadow-sm backdrop-blur-sm">
        <div className="space-y-3">
          <label
            htmlFor="topic"
            className="text-sm font-medium text-foreground/80"
          >
            Topic
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Artificial intelligence is a threat to humanity"
            className="w-full min-h-[120px] p-4 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground/80">
            Select Models{" "}
            <span className="text-muted-foreground ml-1">
              ({selectedModels.length})
            </span>
          </label>
          <ModelSelector
            models={availableModels}
            selectedModels={selectedModels}
            hiddenModelIds={POPULAR_MODELS.map((m) => m.id)}
            onSelect={(id) => {
              setSelectedModels([...selectedModels, id])
              setValidationError(null)
            }}
            onRemove={(id) =>
              setSelectedModels(selectedModels.filter((m) => m !== id))
            }
          />
          <p className="text-xs text-muted-foreground">
            Choose models from OpenRouter to participate in the debate.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground/80">
              Popular Models
            </label>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  const popularIds = POPULAR_MODELS.map((m) => m.id)
                  setSelectedModels(
                    Array.from(new Set([...selectedModels, ...popularIds]))
                  )
                  setValidationError(null)
                }}
                className="hover:text-primary transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const popularIds = POPULAR_MODELS.map((m) => m.id)
                  setSelectedModels(
                    selectedModels.filter((id) => !popularIds.includes(id))
                  )
                }}
                className="hover:text-primary transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {POPULAR_MODELS.map((model) => {
              const isSelected = selectedModels.includes(model.id)
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedModels(
                        selectedModels.filter((m) => m !== model.id)
                      )
                    } else {
                      setSelectedModels([...selectedModels, model.id])
                      setValidationError(null)
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl border transition-all duration-200",
                    isSelected
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-background/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-accent/5"
                  )}
                >
                  {model.name}
                </button>
              )
            })}
          </div>
        </div>

        {validationError && (
          <div className="p-4 text-sm text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {validationError}
          </div>
        )}

        <button
          onClick={handleCreate}
          className="w-full py-4 text-lg font-medium text-white transition-all duration-200 bg-primary rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
        >
          Start Debate
        </button>
      </div>
    </div>
  )
}
