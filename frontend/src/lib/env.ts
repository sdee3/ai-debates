function requireViteEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(`Missing ${name} in frontend environment`)
  }
  return value
}

export const env = {
  convexUrl: requireViteEnv("VITE_CONVEX_URL"),
  convexSiteUrl: requireViteEnv("VITE_CONVEX_SITE_URL"),
  clerkPublishableKey: requireViteEnv("VITE_CLERK_PUBLISHABLE_KEY"),
  clerkSignInUrl: requireViteEnv("VITE_CLERK_SIGN_IN_URL"),
  clerkSignUpUrl: requireViteEnv("VITE_CLERK_SIGN_UP_URL"),
} as const
