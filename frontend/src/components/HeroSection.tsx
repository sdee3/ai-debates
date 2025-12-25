import { Link } from "react-router-dom"
import { MessageSquarePlus } from "lucide-react"

export function HeroSection() {
  return (
    <div className="flex flex-col items-center space-y-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
        AI Debate
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        Explore different perspectives on any topic. Watch as multiple AI models
        debate and rank their agreement.
      </p>

      <Link
        to="/create"
        className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium transition-all duration-200 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
      >
        <MessageSquarePlus className="w-6 h-6 mr-2" />
        Start a New Debate
      </Link>
    </div>
  )
}
