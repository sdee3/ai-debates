import {
  buildIdentitySignInUrl as buildHubSignInUrl,
  createIdentityConvexClient,
  identityApi,
  IdentityConvexAuthSync,
  IdentityConvexScope,
  IdentityUserReadyProvider,
  useIdentityUserReady,
} from "@sdee3/credits";
import { env } from "./env";

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

export const identityConvex = createIdentityConvexClient(env.identityConvexUrl);

export function buildIdentitySignInUrl(redirectUrl?: string): string {
  return buildHubSignInUrl({
    app: "debates",
    signInBaseUrl: env.clerkSignInUrl,
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
