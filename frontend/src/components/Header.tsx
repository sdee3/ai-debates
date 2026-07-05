import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bot, LogOut, Coins } from "lucide-react"
import { useAuth, useClerk } from "@clerk/react"
import { useConvexAuth } from "convex/react"
import { buildIdentitySignInUrl } from "../lib/identitySetup"
import { CreditsBalanceText } from "./CreditsBadge"

export default function Header() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth()
  const { signOut } = useClerk()
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
    <header className="sticky top-0 z-50 w-full glass border-b border-white/5">
      {/* subtle gradient accent line */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-violet/50 to-transparent"
      />
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center hover:opacity-90 transition-opacity"
          aria-label="AI Debate home"
        >
          <div className="relative p-1.5 rounded-xl bg-gradient-to-br from-accent-indigo/30 to-accent-pink/20 border border-white/10 shadow-[0_0_20px_-6px_rgba(99,102,241,0.6)]">
            <Bot className="w-6 h-6 text-accent-indigo" />
          </div>
        </Link>
        <div className="flex items-center space-x-4">
          {isLoaded && !isConvexAuthLoading ? (
            isSignedIn && isAuthenticated ? (
            <>
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center justify-center w-11 h-11 rounded-full glass hover:border-accent-violet/40 transition-colors cursor-pointer"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-muted-foreground"
                  >
                    <circle
                      cx="12"
                      cy="9"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M17.9691 20C17.81 17.1085 16.9247 15 11.9999 15C7.07521 15 6.18991 17.1085 6.03076 20"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl glass-strong overflow-hidden">
                    <CreditsBalanceText />
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
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                window.location.href = buildIdentitySignInUrl(
                  `${window.location.origin}/create`,
                )
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )
          ) : null}
        </div>
      </div>
    </header>
  )
}
