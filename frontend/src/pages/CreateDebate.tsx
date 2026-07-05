import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAction } from "convex/react"
import { api } from "@convex/api"
import { SEO } from "../components/SEO"
import { useModels } from "../hooks/useModels"
import ModelSelector from "../components/ModelSelector"
import { Loader2, AlertCircle, Globe, Lock } from "lucide-react"
import { cn } from "../lib/utils"

const POPULAR_MODELS = [
  { id: "~google/gemini-flash-latest", name: "Gemini 3.1 Flash" },
  { id: "openai/gpt-5.4", name: "GPT 5.4" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "x-ai/grok-4.20", name: "Grok 4.20" },
  { id: "moonshotai/kimi-k2.6", name: "Kimi K2.6" },
  { id: "deepseek/deepseek-v4-flash", name: "Deepseek V4 Flash" },
]

export default function CreateDebate() {
  const navigate = useNavigate()
  const { models, loading, error } = useModels()
  const createDebate = useAction(api.actions.createDebateWithSummary)

  const availableModels = [...models]
  POPULAR_MODELS.forEach((pop) => {
    if (!availableModels.find((m) => m.id === pop.id)) {
      availableModels.push(pop)
    }
  })

  const [topic, setTopic] = useState("")
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!topic.trim()) {
      setValidationError("Please enter a topic.")
      return
    }
    if (selectedModels.length === 0) {
      setValidationError("Please select at least 1 model.")
      return
    }

    setCreating(true)
    try {
      const result = await createDebate({
        topic,
        modelIds: selectedModels,
        isPublic,
      })
      navigate(`/debate/${result.slug}`)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create debate"
      setValidationError(message)
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <>
        <SEO title="Create a New Debate" description="Pick a topic, select AI models, and start a debate." noIndex />
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <SEO
        title="Create a New Debate"
        description="Pick a topic, select AI models, and start a debate. Models will generate arguments and rank their agreement."
        canonical="/create"
        noIndex
      />
      <div className="space-y-1 sm:space-y-1.5 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          Create New Debate
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Define a topic and select AI models to debate it.
        </p>
      </div>

      {error && (
        <div className="p-3 sm:p-4 text-sm text-amber-400 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          Could not load models from API. Popular models are still available
          below.
        </div>
      )}

      <div className="space-y-5 sm:space-y-6 bg-card/50 p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-border/50 shadow-sm backdrop-blur-sm">
        <div className="space-y-1.5 sm:space-y-2">
          <label
            htmlFor="topic"
            className="text-sm font-medium text-foreground/80"
          >
            Topic
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 5000))}
            placeholder="e.g., Artificial intelligence is a threat to humanity"
            className="w-full min-h-[140px] sm:min-h-[120px] p-3 sm:p-4 bg-background/50 border border-border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y placeholder:text-muted-foreground/50 text-base leading-relaxed"
          />
          <div className="text-xs text-muted-foreground text-right">
            {topic.length}/5000
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
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

        <div className="space-y-2">
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
                    Array.from(new Set([...selectedModels, ...popularIds])),
                  )
                  setValidationError(null)
                }}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const popularIds = POPULAR_MODELS.map((m) => m.id)
                  setSelectedModels(
                    selectedModels.filter((id) => !popularIds.includes(id)),
                  )
                }}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {POPULAR_MODELS.map((model) => {
              const isSelected = selectedModels.includes(model.id)
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedModels(
                        selectedModels.filter((m) => m !== model.id),
                      )
                    } else {
                      setSelectedModels([...selectedModels, model.id])
                      setValidationError(null)
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center px-2.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl border transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-background/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-accent/5",
                  )}
                >
                  {model.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 sm:p-4 bg-background/50 border border-border rounded-lg sm:rounded-xl">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {isPublic ? (
              <Globe className="h-5 w-5 shrink-0 text-green-500" />
            ) : (
              <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground/80">
                {isPublic ? "Public" : "Private"}
              </p>
              <p className="text-xs text-pretty text-muted-foreground">
                {isPublic
                  ? "Anyone with the link can view this debate"
                  : "Only you can see this debate"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            aria-pressed={isPublic}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              isPublic ? "bg-green-500" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {validationError && (
          <div className="p-4 text-sm text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {validationError}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-3 sm:py-3.5 text-base sm:text-lg font-medium text-white transition-all duration-200 bg-primary rounded-lg sm:rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed sm:hover:-translate-y-0.5 cursor-pointer"
        >
          {creating ? (
            <span className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating...
            </span>
          ) : (
            "Start Debate"
          )}
        </button>
      </div>
    </div>
  )
}
