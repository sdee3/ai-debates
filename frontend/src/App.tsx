import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { AuthGuard } from "./components/AuthGuard"
import Header from "./components/Header"
import Home from "./pages/Home"
import CreateDebate from "./pages/CreateDebate"
import Debate from "./pages/Debate"
import Credits from "./pages/Credits"

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans antialiased relative">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/create"
              element={
                <AuthGuard>
                  <CreateDebate />
                </AuthGuard>
              }
            />
            <Route path="/debate/:id" element={<Debate />} />
            <Route path="/credits" element={<Credits />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
