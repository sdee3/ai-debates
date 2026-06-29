import { Link } from "react-router-dom"

export function DebateLoadError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
      <p className="text-muted-foreground">
        Something went wrong loading this debate.
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
