import { useAuth } from "@clerk/react"
import { useAction, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { buildIdentitySignInUrl } from "../lib/identitySetup"
import {
  identityApi,
  IdentityConvexScope,
  identityConvex,
  useIdentityUserReady,
  type CreditLedgerEntry,
  type CreditPriceKey,
} from "../lib/identitySetup"

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp))
}

function ledgerLabel(entry: CreditLedgerEntry): string {
  if (entry.reason.trim()) {
    return entry.reason
  }
  switch (entry.type) {
    case "grant":
      return "Credits added"
    case "debit":
      return "Credits used"
    case "refund":
      return "Refund"
    case "adjustment":
      return "Balance adjustment"
  }
}

function appLabel(appSlug: CreditLedgerEntry["appSlug"]): string | null {
  if (!appSlug) {
    return null
  }
  switch (appSlug) {
    case "debates":
      return "AI Debates"
    case "virgo":
      return "Virgo"
    case "astro-mate":
      return "Astro Mate"
    case "portfolio":
      return "Portfolio"
  }
}

export function BuyCreditsPage() {
  return (
    <IdentityConvexScope identityConvex={identityConvex}>
      <BuyCreditsPageInner />
    </IdentityConvexScope>
  )
}

function BuyCreditsPageInner() {
  const { isSignedIn } = useAuth()
  const identityReady = useIdentityUserReady()
  const catalog = useQuery(identityApi.credits.products.getCatalog, {})
  const balance = useQuery(
    identityApi.credits.queries.getBalance,
    isSignedIn && identityReady ? {} : "skip",
  )
  const ledger = useQuery(
    identityApi.credits.queries.listLedger,
    isSignedIn && identityReady
      ? { paginationOpts: { numItems: 25, cursor: null } }
      : "skip",
  )
  const createCheckout = useAction(
    identityApi.credits.stripeCheckout.createCheckoutSession,
  )
  const createPortal = useAction(
    identityApi.credits.stripeCheckout.createBillingPortalSession,
  )
  const [loadingKey, setLoadingKey] = useState<PriceKey | "portal" | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const returnUrl = `${window.location.origin}${window.location.pathname}`

  async function startCheckout(priceKey: PriceKey) {
    if (!isSignedIn || !identityReady) {
      window.location.href = buildIdentitySignInUrl(returnUrl)
      return
    }

    setLoadingKey(priceKey)
    setError(null)
    try {
      const { url } = await createCheckout({
        priceKey,
        successUrl: `${returnUrl}?checkout=success`,
        cancelUrl: `${returnUrl}?checkout=cancelled`,
      })
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
      setLoadingKey(null)
    }
  }

  async function openPortal() {
    setLoadingKey("portal")
    setError(null)
    try {
      const { url } = await createPortal({ returnUrl })
      window.location.href = url
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open billing portal",
      )
      setLoadingKey(null)
    }
  }

  const debateCost = catalog?.actionCosts.debates_llm_response ?? 200

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          SDEE3 Credits
        </p>
        <h1 className="text-3xl font-bold">Credits</h1>
        <p className="text-sm text-muted-foreground">
          One balance works across AI Debates, Virgo, Astro Mate, and other
          SDEE3 apps.
        </p>
        {isSignedIn && balance !== undefined ? (
          <p className="text-lg pt-2">
            <span className="text-muted-foreground">Your balance: </span>
            <span className="font-semibold text-primary">
              {balance.balance.toLocaleString()} credits
            </span>
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {catalog === undefined ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-card/40 p-4">
            <h2 className="text-sm font-medium text-foreground">
              AI Debates credit cost
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Each debate deducts{" "}
              <span className="font-medium text-foreground">
                {debateCost.toLocaleString()} credits per LLM
              </span>{" "}
              selected. For example, a debate with 3 models costs{" "}
              {(debateCost * 3).toLocaleString()} credits.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium">Purchase credits</h2>
              {!isSignedIn ? (
                <Link
                  to="#"
                  onClick={(event) => {
                    event.preventDefault()
                    window.location.href = buildIdentitySignInUrl(returnUrl)
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Sign in to purchase
                </Link>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Monthly subscriptions
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {catalog.subscriptions.map((product) => (
                    <ProductCard
                      key={product.key}
                      title={product.label}
                      subtitle={`${formatUsd(product.priceUsd)} / month`}
                      description={product.description}
                      loading={loadingKey === product.key}
                      onBuy={() => void startCheckout(product.key)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  One-time packs
                </h3>
                <div className="grid gap-3">
                  {catalog.packs.map((product) => (
                    <ProductCard
                      key={product.key}
                      title={product.label}
                      subtitle={formatUsd(product.priceUsd)}
                      description={product.description}
                      loading={loadingKey === product.key}
                      onBuy={() => void startCheckout(product.key)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {isSignedIn ? (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={loadingKey === "portal"}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {loadingKey === "portal"
                    ? "Opening…"
                    : "Manage subscription"}
                </button>
              </div>
            ) : null}
          </section>

          {isSignedIn ? (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Transaction history</h2>
              {ledger === undefined ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : ledger.page.length === 0 ? (
                <p className="rounded-xl border border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  No transactions yet. Purchase credits or run a debate to see
                  activity here.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50 text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.page.map((entry) => (
                        <tr
                          key={entry._id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div>{ledgerLabel(entry)}</div>
                            {appLabel(entry.appSlug) ? (
                              <div className="text-xs text-muted-foreground">
                                {appLabel(entry.appSlug)}
                              </div>
                            ) : null}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium tabular-nums ${
                              entry.amount >= 0
                                ? "text-emerald-400"
                                : "text-foreground"
                            }`}
                          >
                            {entry.amount >= 0 ? "+" : ""}
                            {entry.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

type PriceKey = CreditPriceKey

function ProductCard({
  title,
  subtitle,
  description,
  loading,
  onBuy,
}: {
  title: string
  subtitle: string
  description: string
  loading: boolean
  onBuy: () => void
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card/50 p-4">
      <div className="space-y-1">
        <div className="font-medium">{title}</div>
        <div className="text-2xl font-semibold text-primary">{subtitle}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        onClick={onBuy}
        disabled={loading}
        className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Redirecting…" : "Purchase"}
      </button>
    </div>
  )
}
