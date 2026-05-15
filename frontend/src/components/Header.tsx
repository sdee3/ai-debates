import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bot, LogOut, Coins } from "lucide-react"
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react"

export default function Header() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    navigate("/")
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-secondary transition-colors cursor-pointer"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                  <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M17.9691 20C17.81 17.1085 16.9247 15 11.9999 15C7.07521 15 6.18991 17.1085 6.03076 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                  <Link
                    to="/credits"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Credits</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-t border-border cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
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
