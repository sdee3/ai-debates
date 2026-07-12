import { lazy, Suspense } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Header from "./components/Header"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { DebateLoadError } from "./components/DebateLoadError"
import PageLoader from "./components/PageLoader"
import { creditsEnabled } from "./lib/identitySetup"

const Home = lazy(() => import("./pages/Home"))
const CreateDebate = lazy(() => import("./pages/CreateDebate"))
const Debate = lazy(() => import("./pages/Debate"))
const Credits = lazy(() => import("./pages/Credits"))
const NotFound = lazy(() => import("./pages/NotFound"))
const AuthGate = lazy(() =>
  import("./components/AuthGate").then((m) => ({ default: m.AuthGate })),
)

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans antialiased relative">
        <Header />
        <main className="container mx-auto py-4 sm:py-6 lg:py-8">
          <Routes>
            <Route
              path="/"
              element={
                <LazyRoute>
                  <Home />
                </LazyRoute>
              }
            />
            <Route
              path="/create"
              element={
                <LazyRoute>
                  <AuthGate>
                    <CreateDebate />
                  </AuthGate>
                </LazyRoute>
              }
            />
            <Route
              path="/debate/:slugOrId"
              element={
                <ErrorBoundary fallback={<DebateLoadError />}>
                  <LazyRoute>
                    <Debate />
                  </LazyRoute>
                </ErrorBoundary>
              }
            />
            <Route
              path="/credits"
              element={
                creditsEnabled ? (
                  <LazyRoute>
                    <Credits />
                  </LazyRoute>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="*"
              element={
                <LazyRoute>
                  <NotFound />
                </LazyRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
