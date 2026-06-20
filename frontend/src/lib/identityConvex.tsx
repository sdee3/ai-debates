import { useAuth } from "@clerk/react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useEffect, type ReactNode } from "react"
import { env } from "./env"

export const identityConvex = new ConvexReactClient(env.identityConvexUrl)

export function IdentityConvexAuthSync() {
  const { getToken, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isSignedIn) {
      identityConvex.clearAuth()
      return
    }

    identityConvex.setAuth(async () => {
      return (await getToken({ template: "convex" })) ?? null
    })
  }, [getToken, isSignedIn])

  return null
}

export function IdentityConvexScope({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={identityConvex}>{children}</ConvexProvider>
  )
}
