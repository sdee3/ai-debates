import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import { ClerkProvider } from "@clerk/react"
import { ConvexReactClient } from "convex/react"
import "./index.css"
import App from "./App.tsx"
import { ConvexProviderWithClerkTemplate } from "./lib/convexClerkAuth"
import {
  creditsEnabled,
  identityApi,
  IdentityConvexAuthSync,
  identityConvex,
  IdentityUserReadyProvider,
} from "./lib/identitySetup"

const convexUrl = import.meta.env.VITE_CONVEX_URL as string
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
const signInUrl = import.meta.env.VITE_CLERK_SIGN_IN_URL as string
const signUpUrl = import.meta.env.VITE_CLERK_SIGN_UP_URL as string

if (!convexUrl || !publishableKey || !signInUrl || !signUpUrl) {
  throw new Error(
    "Missing VITE_CONVEX_URL, VITE_CLERK_PUBLISHABLE_KEY, VITE_CLERK_SIGN_IN_URL, or VITE_CLERK_SIGN_UP_URL. Copy env vars into frontend/.env.local",
  )
}

const convex = new ConvexReactClient(convexUrl)

function Root() {
  // Credits/identity integration is only mounted when wired to a real
  // Identity Convex deployment (PROD). Locally we skip mounting the
  // providers entirely so they never fire `users:upsertFromClient` /
  // `credits/*` calls that have no public function to back them.
  if (!creditsEnabled) {
    return (
      <HelmetProvider>
        <App />
      </HelmetProvider>
    )
  }

  return (
    <IdentityUserReadyProvider
      upsertFromClient={identityApi.users.upsertFromClient}
      identityConvex={identityConvex}
    >
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </IdentityUserReadyProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      allowedRedirectOrigins={[
        "https://identity.sdee3.com",
        "https://ai-debate.sdee3.com",
        "https://winning-jaybird-28.accounts.dev",
        "http://localhost:5173",
      ]}
    >
      <ConvexProviderWithClerkTemplate client={convex}>
        {creditsEnabled ? (
          <IdentityConvexAuthSync identityConvex={identityConvex} />
        ) : null}
        <Root />
      </ConvexProviderWithClerkTemplate>
    </ClerkProvider>
  </StrictMode>,
)
