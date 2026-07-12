import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

const BUILD_ID = new Date().toISOString()

function buildIdPlugin(buildId: string): Plugin {
  return {
    name: "build-id",
    config() {
      return {
        define: {
          __BUILD_ID__: JSON.stringify(buildId),
        },
      }
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-id.txt",
        source: buildId,
      })
    },
  }
}

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
    buildIdPlugin(BUILD_ID),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
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
        // Installability only — no offline shell; always fetch fresh HTML/JS/CSS.
        globPatterns: ["**/*.{ico,png,svg}"],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.clerk\.accounts\.dev\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.clerk\.com\/.*/i,
            handler: "NetworkOnly",
          },
        ],
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
  server: {
    fs: {
      allow: [".."],
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
