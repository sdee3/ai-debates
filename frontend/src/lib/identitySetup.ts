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
  if (!identityConvex) {
    return;
  }

  try {
    await identityConvex.query(identityApi.credits.queries.getBalance, {});
  } catch {
    // Non-blocking; live subscriptions may still catch up.
  }
}
