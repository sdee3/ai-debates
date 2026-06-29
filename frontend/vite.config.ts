import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined

  if (id.includes("node_modules/convex/")) return "convex-vendor"
  if (id.includes("node_modules/@clerk/")) return "clerk-vendor"
  if (
    id.includes("@sdee3/credits") ||
    id.includes("identity/packages/credits")
  ) {
    return "identity-vendor"
  }
  if (id.includes("framer-motion") || id.includes("lucide-react")) {
    return "ui-vendor"
  }
  if (
    id.includes("cmdk") ||
    id.includes("clsx") ||
    id.includes("tailwind-merge") ||
    id.includes("zustand")
  ) {
    return "utils-vendor"
  }
  if (
    id.includes("node_modules/react/") ||
    id.includes("node_modules/react-dom/") ||
    id.includes("node_modules/react-router") ||
    id.includes("node_modules/react-helmet")
  ) {
    return "react-vendor"
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ["VITE_"],
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt", "sitemap.xml"],
      pwaAssets: {
        image: "public/favicon.svg",
        preset: "minimal-2023",
        includeHtmlHeadLinks: true,
        overrideManifestIcons: true,
        injectThemeColor: true,
      },
      manifest: {
        name: "AI Debate",
        short_name: "AI Debate",
        description: "Watch AI models debate any topic and rank their agreement",
        theme_color: "#09090b",
        background_color: "#09090b",
        display: "standalone",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "education"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@convex": path.resolve(__dirname, "../backend/convex/_generated"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
})
