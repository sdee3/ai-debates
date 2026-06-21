import { useAuth } from "@clerk/react"
import { useQuery } from "convex/react"
import {
  identityApi,
  IdentityConvexScope,
  identityConvex,
  useIdentityUserReady,
} from "../lib/identitySetup"

function CreditsBalanceTextInner() {
  const { isSignedIn } = useAuth()
  const identityReady = useIdentityUserReady()
  const balance = useQuery(
    identityApi.credits.queries.getBalance,
    isSignedIn && identityReady ? {} : "skip",
  )

  if (!isSignedIn) {
    return null
  }

  if (balance === undefined) {
    return (
      <p className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
        Credits…
      </p>
    )
  }

  return (
    <p className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
      {balance.balance.toLocaleString()} credits
    </p>
  )
}

export function CreditsBalanceText() {
  return (
    <IdentityConvexScope identityConvex={identityConvex}>
      <CreditsBalanceTextInner />
    </IdentityConvexScope>
  )
}
