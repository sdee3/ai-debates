import { useAuth } from "@clerk/react"
import { useConvexAuth } from "convex/react"
import { useEffect, useRef, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import {
  readSignInTicket,
  useSignInTokenHandoff,
} from "@sdee3/credits"
import { buildIdentitySignInUrl } from "../lib/identitySetup"

export { buildIdentitySignInUrl }

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
    if (readSignInTicket()) {
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
