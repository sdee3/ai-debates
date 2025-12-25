import { Link } from "react-router-dom"
import { Clock, X } from "lucide-react"
import type { Debate } from "../store/useDebateStore"

interface DebateCardProps {
  debate: Debate
  onDelete: (e: React.MouseEvent, id: string) => void
}

export function DebateCard({ debate, onDelete }: DebateCardProps) {
  return (
    <Link
      to={`/debate/${debate.id}`}
      className="group relative flex items-center justify-between p-6 bg-card/50 border border-border/50 rounded-xl hover:bg-accent/50 hover:border-primary/20 transition-all duration-200"
    >
      <button
        onClick={(e) => onDelete(e, debate.id)}
        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10 opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
        title="Delete debate"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex flex-col space-y-2">
        <span className="font-medium text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {debate.topic}
        </span>
        <div className="flex items-center text-xs text-muted-foreground space-x-3">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(debate.createdAt).toISOString().split("T")[0]}
          </div>
          <div className="w-1 h-1 rounded-full bg-border" />
          <span>{debate.modelIds.length} Models</span>
          <div className="w-1 h-1 rounded-full bg-border" />
          <span
            className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-medium ${
              debate.status === "completed"
                ? "bg-green-500/10 text-green-500"
                : "bg-yellow-500/10 text-yellow-500"
            }`}
          >
            {debate.status}
          </span>
        </div>
      </div>
    </Link>
  )
}
