import { Link, useNavigate } from "react-router-dom"
import { Bot, LogOut } from "lucide-react"
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react"

export default function Header() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center space-x-2 text-xl font-bold hover:opacity-80 transition-opacity"
        >
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            AI Debate
          </span>
        </Link>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/create"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
