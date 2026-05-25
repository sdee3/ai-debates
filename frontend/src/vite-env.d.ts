/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CONVEX_URL: string
  readonly CONVEX_SITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
