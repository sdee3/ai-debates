import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import PasswordProtection from "./components/PasswordProtection"
import Header from "./components/Header"
import Home from "./pages/Home"
import CreateDebate from "./pages/CreateDebate"
import Debate from "./pages/Debate"

function App() {
  return (
    <Router>
      <PasswordProtection>
        <div className="min-h-screen bg-background text-foreground font-sans antialiased relative">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateDebate />} />
              <Route path="/debate/:id" element={<Debate />} />
            </Routes>
          </main>
        </div>
      </PasswordProtection>
    </Router>
  )
}

export default App
