import { Link } from "react-router-dom"
import { MessageSquarePlus } from "lucide-react"

export function HeroSection() {
  return (
    <div className="relative flex flex-col items-center space-y-8 text-center">
      {/* floating colored glow behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-56 w-[min(620px,90vw)] rounded-full blur-3xl opacity-60 animate-float-glow bg-[radial-gradient(closest-side,rgba(99,102,241,0.55),rgba(168,85,247,0.25),transparent)]"
      />

      <h1 className="relative text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-pink bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(168,85,247,0.35)]">
        AI Debate
      </h1>

      <p className="relative text-lg sm:text-xl text-muted-foreground max-w-2xl">
        Explore different perspectives on any topic. Watch as multiple AI models
        debate and rank their agreement.
      </p>

      <Link
        to="/create"
        className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold transition-all duration-200 rounded-full text-white shadow-[0_10px_40px_-10px_rgba(168,85,247,0.7)] bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-pink hover:shadow-[0_14px_50px_-8px_rgba(236,72,153,0.7)] hover:-translate-y-0.5"
      >
        <MessageSquarePlus className="w-6 h-6 mr-2" />
        Start a New Debate
      </Link>
    </div>
  )
}