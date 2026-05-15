import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react"
import type { ReactNode } from "react"
import { useState } from "react"
import { Loader2, Mail, Lock } from "lucide-react"

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const flow = isSignUp ? "signUp" : "signIn"
      await signIn("password", { email, password, flow })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            {isSignUp ? "Sign Up" : "Sign In"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp
              ? "Create an account with your email and password."
              : "Sign in with your email and password."}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-lg font-medium text-white transition-all duration-200 bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? "Please wait..."
              : isSignUp
                ? "Sign Up"
                : "Sign In"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError("")
              }}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
