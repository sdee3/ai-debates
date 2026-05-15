import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt", "sitemap.xml"],
      pwaAssets: {
        image: "public/pwa-icon.svg",
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
      "@convex-api": path.resolve(__dirname, "src/lib/convex-api.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["framer-motion", "lucide-react"],
          "utils-vendor": ["clsx", "tailwind-merge", "zustand", "cmdk"],
        },
      },
    },
  },
})
