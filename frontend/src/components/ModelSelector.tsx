import { useState } from "react"
import { Command } from "cmdk"
import { Check, ChevronsUpDown, X } from "lucide-react"
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

  const filteredModels = models.filter(
    (model) =>
      (model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.id.toLowerCase().includes(search.toLowerCase())) &&
      !hiddenModelIds.includes(model.id)
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        {selectedModels.map((modelId) => {
          const model = models.find((m) => m.id === modelId)
          return (
            <div
              key={modelId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full border border-primary/20 animate-in fade-in zoom-in duration-200"
            >
              <span>{model?.name || modelId}</span>
              <button
                onClick={() => onRemove(modelId)}
                className="hover:text-destructive focus:outline-none transition-colors"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-between w-full px-4 py-3 text-sm bg-background/50 border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setOpen(!open)}
        >
          <span className="text-muted-foreground">
            {open ? "Type to search..." : "Select models..."}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        </div>

        {open && (
          <div className="absolute z-50 w-full mt-2 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-xl overflow-hidden">
            <Command className="w-full" shouldFilter={false}>
              <div
                className="flex items-center border-b border-border px-3"
                cmdk-input-wrapper=""
              >
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search models..."
                  className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                />
              </div>
              <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                <Command.Empty className="py-6 text-center text-sm">
                  No models found.
                </Command.Empty>
                {filteredModels.map((model) => (
                  <Command.Item
                    key={model.id}
                    value={model.id}
                    disabled={false}
                    onSelect={() => {
                      if (selectedModels.includes(model.id)) {
                        onRemove(model.id)
                      } else {
                        onSelect(model.id)
                      }
                      setSearch("")
                    }}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground",
                      selectedModels.includes(model.id) &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedModels.includes(model.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.id}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
