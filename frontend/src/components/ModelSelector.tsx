import { useState, useRef, useEffect } from "react"
import { Command } from "cmdk"
import { Check, ChevronsUpDown, X, Search } from "lucide-react"
import { cn } from "../lib/utils"
import { type OpenRouterModel } from "../lib/openrouter"

interface ModelSelectorProps {
  models: OpenRouterModel[]
  selectedModels: string[]
  onSelect: (modelId: string) => void
  onRemove: (modelId: string) => void
  disabled?: boolean
  hiddenModelIds?: string[]
}

export default function ModelSelector({
  models,
  selectedModels,
  onSelect,
  onRemove,
  disabled,
  hiddenModelIds = [],
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)

  const filteredModels = models.filter(
    (model) =>
      (model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.id.toLowerCase().includes(search.toLowerCase())) &&
      !hiddenModelIds.includes(model.id),
  )

  // Close on outside click or Escape. A `fixed` overlay doesn't work here
  // because `backdrop-filter` on an ancestor becomes the containing block
  // for fixed descendants — so a document-level listener is the robust fix.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn("w-full", open && "relative z-50")}>
      {/* Selected chips — kept above the click-away overlay */}
      <div className="flex flex-wrap gap-2 mb-2 relative z-50">
        {selectedModels.map((modelId) => {
          const model = models.find((m) => m.id === modelId)
          return (
            <div
              key={modelId}
              className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 text-sm bg-accent-violet/15 text-accent-violet rounded-full border border-accent-violet/40 animate-in fade-in zoom-in duration-200"
            >
              <span>{model?.name || modelId}</span>
              <button
                type="button"
                onClick={() => onRemove(modelId)}
                className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-destructive/15 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 transition-colors cursor-pointer"
                disabled={disabled}
                aria-label={`Remove ${model?.name || modelId}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="relative z-50">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          className={cn(
            "flex items-center justify-between w-full gap-2 px-3.5 py-3 text-sm bg-white/[0.03] border rounded-xl sm:rounded-2xl backdrop-blur-sm transition-all cursor-pointer",
            open
              ? "border-accent-violet/50 ring-2 ring-accent-violet/30"
              : "border-white/10 hover:border-accent-violet/40",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={cn("truncate", !selectedModels.length && "text-muted-foreground")}>
            {selectedModels.length > 0
              ? `${selectedModels.length} model${selectedModels.length === 1 ? "" : "s"} selected`
              : "Select models…"}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-60 shrink-0" />
        </button>

        {open && (
          <>
            <div
              role="listbox"
              className="absolute left-0 right-0 z-50 mt-2 glass-strong rounded-2xl overflow-hidden"
            >
              <Command className="w-full" shouldFilter={false}>
                {/* Search row */}
                <div className="flex items-center gap-2 border-b border-white/10 px-3.5">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search models…"
                    className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50"
                    autoFocus
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Results */}
                <Command.List className="max-h-[280px] overflow-y-auto overflow-x-hidden p-1.5">
                  <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                    No models found.
                  </Command.Empty>
                  {filteredModels.map((model) => {
                    const isSelected = selectedModels.includes(model.id)
                    return (
                      <Command.Item
                        key={model.id}
                        value={model.id}
                        onSelect={() => {
                          if (isSelected) {
                            onRemove(model.id)
                          } else {
                            onSelect(model.id)
                          }
                          setSearch("")
                        }}
                        className={cn(
                          "group relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm outline-none transition-colors",
                          "aria-selected:bg-white/[0.06] aria-selected:text-foreground",
                          "hover:bg-white/[0.06]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                            isSelected
                              ? "bg-accent-violet border-accent-violet text-white"
                              : "border-white/15 group-hover:border-accent-violet/50",
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium text-foreground/90">
                            {model.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {model.id}
                          </span>
                        </div>
                      </Command.Item>
                    )
                  })}
                </Command.List>
              </Command>
            </div>
          </>
        )}
      </div>
    </div>
  )
}