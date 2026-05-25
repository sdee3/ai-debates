import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import { ClerkProvider, useAuth } from "@clerk/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ConvexReactClient } from "convex/react"
import "./index.css"
import App from "./App.tsx"
import { env } from "./lib/env"

const convex = new ConvexReactClient(env.convexUrl)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={env.clerkPublishableKey}
      signInUrl={env.clerkSignInUrl}
      signUpUrl={env.clerkSignUpUrl}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
)
