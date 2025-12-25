import { useState, useEffect } from "react"
import { useLocation, matchPath } from "react-router-dom"

interface PasswordProtectionProps {
  children: React.ReactNode
}

export default function PasswordProtection({
  children,
}: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const storedPassword = localStorage.getItem("platform_password")

    if (auth === "true" && storedPassword) {
      setIsAuthenticated(true)
    } else {
      localStorage.removeItem("isAuthenticated")
      setIsAuthenticated(false)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("http://localhost:3000/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("platform_password", password)
        setIsAuthenticated(true)
      } else {
        setError(data.error || "Incorrect password")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to verify password")
    } finally {
      setLoading(false)
    }
  }

  const isPublicRoute = matchPath("/debate/:id", location.pathname)

  if (isAuthenticated || isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Protected Access
          </h2>
          <p className="mt-2 text-sm text-white">
            Please enter the password to access this platform.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-md border-0 py-1.5 bg-gray-900 text-white ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Enter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
