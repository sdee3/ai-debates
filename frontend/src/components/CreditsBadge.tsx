import { useAuth } from "@clerk/react"
import { useQuery } from "convex/react"
import { Link } from "react-router-dom"
import { identityApi } from "../lib/identity-api"
import { IdentityConvexScope } from "../lib/identityConvex"

function CreditsBadgeInner() {
  const { isSignedIn } = useAuth()
  const balance = useQuery(
    identityApi.credits.queries.getBalance,
    isSignedIn ? {} : "skip",
  )

  if (!isSignedIn) {
    return null
  }

  if (balance === undefined) {
    return (
      <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
        Credits…
      </span>
    )
  }

  return (
    <Link
      to="/credits"
      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
      title="SDEE3 credits balance"
    >
      {balance.balance.toLocaleString()} credits
    </Link>
  )
}

export function CreditsBadge() {
  return (
    <IdentityConvexScope>
      <CreditsBadgeInner />
    </IdentityConvexScope>
  )
}
