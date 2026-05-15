import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexReactClient } from "convex/react"
import './index.css'
import App from './App.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </HelmetProvider>
  </StrictMode>,
)
