import { Link } from "react-router-dom"
import { MessageSquarePlus, Clock, ChevronRight } from "lucide-react"
import { useDebateStore } from "../store/useDebateStore"

export default function Home() {
  const { debates } = useDebateStore()

  return (
    <div className="flex flex-col items-center min-h-[80vh] space-y-24 py-12">
      <div className="flex flex-col items-center space-y-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          AI Debate
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Explore different perspectives on any topic. Watch as multiple AI
          models debate and rank their agreement.
        </p>

        <Link
          to="/create"
          className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium transition-all duration-200 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
        >
          <MessageSquarePlus className="w-6 h-6 mr-2" />
          Start a New Debate
        </Link>
      </div>

      {debates.length > 0 && (
        <div className="w-full max-w-3xl space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-semibold">Previous Debates</h2>
            <span className="text-sm text-muted-foreground">
              {debates.length} total
            </span>
          </div>
          <div className="grid gap-4">
            {debates.map((debate) => (
              <Link
                key={debate.id}
                to={`/debate/${debate.id}`}
                className="group relative flex items-center justify-between p-6 bg-card/50 border border-border/50 rounded-xl hover:bg-accent/50 hover:border-primary/20 transition-all duration-200"
              >
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
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
