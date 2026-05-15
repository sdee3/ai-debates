import type { Debate } from "../store/useDebateStore"
import { DebateCard } from "./DebateCard"

interface DebateListProps {
  debates: Debate[]
  onDelete: (e: React.MouseEvent, id: string) => void
  showAll?: boolean
  onShowAll?: () => void
}

export function DebateList({ debates, onDelete, showAll, onShowAll }: DebateListProps) {
  if (debates.length === 0) return null

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-semibold">Previous Debates</h2>
        <span className="text-sm text-muted-foreground">
          {debates.length} total
        </span>
      </div>
      <div className="grid gap-4">
        {debates.map((debate) => (
          <DebateCard key={debate.id} debate={debate} onDelete={onDelete} />
        ))}
      </div>
      {!showAll && onShowAll && (
        <div className="flex justify-center">
          <button
            onClick={onShowAll}
            className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Show all
          </button>
        </div>
      )}
    </div>
  )
}
