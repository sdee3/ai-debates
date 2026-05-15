import { Link } from "react-router-dom"
import { SEO } from "../components/SEO"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <SEO
        title="Page Not Found"
        description="The page you are looking for does not exist."
      />
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-2xl font-semibold">Page Not Found</h2>
      <p className="text-muted-foreground text-center max-w-md">
        It looks like you've reached a dead-end. The page you're looking for
        doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Return Home
      </Link>
    </div>
  )
}
