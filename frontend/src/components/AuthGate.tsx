import { useAuth } from "@clerk/react"
import { useSignIn } from "@clerk/react/legacy"
import { useConvexAuth } from "convex/react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { env } from "../lib/env"

const APP_SLUG = "debates"

export function buildIdentitySignInUrl(redirectUrl?: string): string {
  const base = env.clerkSignInUrl
  const params = new URLSearchParams({
    app: APP_SLUG,
    redirect_url:
      redirectUrl ??
      `${window.location.origin}${window.location.pathname}${window.location.search}`,
  })
  return `${base}?${params.toString()}`
}

type HandoffState = "idle" | "pending" | "done" | "error"

function useSignInTokenHandoff(): HandoffState {
  const ticket = useMemo(
    () => new URLSearchParams(window.location.search).get("token"),
    [],
  )
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth()
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn()
  const [state, setState] = useState<HandoffState>(ticket ? "pending" : "idle")
  const ran = useRef(false)

  useEffect(() => {
    if (!ticket) {
      setState("idle")
      return
    }
    if (
      !clerkLoaded ||
      !signInLoaded ||
      !signIn ||
      !setActive ||
      isSignedIn ||
      ran.current
    ) {
      return
    }
    ran.current = true
    setState("pending")

    void (async () => {
      try {
        const attempt = await signIn.create({
          strategy: "ticket",
          ticket,
        })
        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActive({ session: attempt.createdSessionId })
          const url = new URL(window.location.href)
          url.searchParams.delete("token")
          const next =
            url.pathname + (url.search ? url.search : "") + url.hash
          window.history.replaceState({}, "", next)
          setState("done")
          return
        }
        setState("error")
      } catch {
        setState("error")
      }
    })()
  }, [ticket, clerkLoaded, signInLoaded, signIn, setActive, isSignedIn])

  return ticket ? state : "idle"
}

function AuthLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="sr-only">{message}</p>
    </div>
  )
}

function ConvexSessionError() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] px-4">
      <div className="max-w-md space-y-3 text-center">
        <p className="font-medium text-foreground">
          Signed in, but the app could not connect to the server
        </p>
        <p className="text-sm text-muted-foreground">
          Ensure the debates Convex deployment has{" "}
          <code className="text-xs">CLERK_JWT_ISSUER_DOMAIN</code> set and the
          Clerk &quot;convex&quot; JWT template is enabled, then sign in again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl px-4 py-2 text-sm text-white bg-primary hover:bg-primary/90 cursor-pointer"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const handoff = useSignInTokenHandoff()
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth()
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth()
  const redirectStarted = useRef(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("token")) {
      return
    }
    if (!clerkLoaded || isSignedIn || redirectStarted.current) {
      return
    }
    redirectStarted.current = true
    window.location.replace(buildIdentitySignInUrl())
  }, [clerkLoaded, isSignedIn])

  if (handoff === "pending") {
    return <AuthLoading message="Signing you in…" />
  }

  if (handoff === "error") {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="font-medium text-foreground">
            Sign-in link expired or invalid
          </p>
          <p className="text-sm text-muted-foreground">
            Return to the identity hub and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              redirectStarted.current = false
              window.location.replace(buildIdentitySignInUrl())
            }}
            className="rounded-xl px-4 py-2 text-sm text-white bg-primary hover:bg-primary/90 cursor-pointer"
          >
            Sign in again
          </button>
        </div>
      </div>
    )
  }

  if (!clerkLoaded) {
    return <AuthLoading />
  }

  if (!isSignedIn) {
    return <AuthLoading message="Redirecting to sign in…" />
  }

  if (convexLoading) {
    return <AuthLoading />
  }

  if (!isAuthenticated) {
    return <ConvexSessionError />
  }

  return <>{children}</>
}
