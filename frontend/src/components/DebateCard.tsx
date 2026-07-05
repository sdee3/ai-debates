import { Link } from "react-router-dom"
import { Clock, X, Globe, Lock } from "lucide-react"
import type { Debate } from "../store/useDebateStore"

import type { Id } from "@convex/dataModel"

interface DebateCardProps {
  debate: Debate
  onDelete: (e: React.MouseEvent, id: Id<"debates">) => void
}

export function DebateCard({ debate, onDelete }: DebateCardProps) {
  return (
    <Link
      to={`/debate/${debate.id}`}
      className="group relative flex items-center justify-between p-6 glass rounded-2xl transition-all duration-200 hover:border-accent-violet/40 hover:shadow-[0_10px_40px_-12px_rgba(168,85,247,0.45)]"
    >
      {/* gradient top accent */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent-violet/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
      <button
        onClick={(e) => onDelete(e, debate.id)}
        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10 opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
        title="Delete debate"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex flex-col space-y-2 w-full pr-8">
        <span className="font-medium text-lg group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent-indigo group-hover:to-accent-pink transition-all duration-200">
          {debate.topic}
        </span>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {new Date(debate.createdAt).toISOString().split("T")[0]}
            </div>
            <span className="w-1 h-1 rounded-full bg-border shrink-0" />
            <span>{debate.modelIds.length} Models</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium border ${
                debate.status === "completed"
                  ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20"
                  : "bg-accent-amber/10 text-accent-amber border-accent-amber/20"
              }`}
            >
              {debate.status}
            </span>
            <span className="w-1 h-1 rounded-full bg-border shrink-0" />
            {debate.isPublic ? (
              <span className="inline-flex items-center text-xs font-medium text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2.5 py-1 rounded-full">
                <Globe className="w-3 h-3 mr-1" />
                Public
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
