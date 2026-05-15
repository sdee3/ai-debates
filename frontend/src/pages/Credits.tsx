import { SEO } from "../components/SEO"

export default function Credits() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <SEO
        title="Credits"
        description="Credits and acknowledgments for the AI Debate platform."
        canonical="/credits"
      />
      <h1 className="text-3xl font-bold">Credits</h1>
      <p className="mt-4 text-muted-foreground">Coming soon.</p>
    </div>
  )
}
