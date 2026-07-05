import {
  buildIdentitySignInUrl as buildHubSignInUrl,
  createIdentityConvexClient,
  identityApi,
  IdentityConvexAuthSync,
  IdentityConvexScope,
  IdentityUserReadyProvider,
  useIdentityUserReady,
} from "@sdee3/credits";

const identityConvexUrl = import.meta.env.VITE_IDENTITY_CONVEX_URL as
  | string
  | undefined;

if (import.meta.env.PROD && !identityConvexUrl) {
  throw new Error(
    "Missing VITE_IDENTITY_CONVEX_URL in production. Credits require the Identity Convex deployment URL.",
  );
}

export const identityConvex = createIdentityConvexClient(identityConvexUrl);

/**
 * Credits are only available in production-style deployments that have an
 * Identity Convex deployment URL configured. On local/dev environments the
 * Identity Convex backing deployment does not expose the public functions
 * (users:upsertFromClient, credits/*), so any attempt to view or access
 * credits there produces Convex "Could not find public function" errors.
 *
 * Disable every credits entrypoint (UI + identity providers) when this is false.
 */
export const creditsEnabled =
  import.meta.env.PROD && Boolean(identityConvexUrl);

export {
  identityApi,
  IdentityConvexAuthSync,
  IdentityConvexScope,
  IdentityUserReadyProvider,
  useIdentityUserReady,
};

export type {
  CreditBalance,
  CreditCatalog,
  CreditLedgerEntry,
  CreditPack,
  CreditPriceKey,
} from "@sdee3/credits";

const IDENTITY_SIGN_IN_URL =
  import.meta.env.VITE_CLERK_SIGN_IN_URL ??
  "https://identity.sdee3.com/sign-in";

export function buildIdentitySignInUrl(redirectUrl?: string): string {
  return buildHubSignInUrl({
    app: "debates",
    signInBaseUrl: IDENTITY_SIGN_IN_URL,
    redirectUrl,
  });
}

export async function refreshCreditsBalance(): Promise<void> {
  if (!creditsEnabled || !identityConvex) {
    return;
  }

  try {
    await identityConvex.query(identityApi.credits.queries.getBalance, {});
  } catch {
    // Non-blocking; live subscriptions may still catch up.
  }
}
