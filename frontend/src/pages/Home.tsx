import { useDebateStore } from "../store/useDebateStore"
import { HeroSection } from "../components/HeroSection"
import { DebateList } from "../components/DebateList"

export default function Home() {
  const { debates, deleteDebate } = useDebateStore()

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm("Are you sure you want to delete this debate?")) {
      deleteDebate(id)
    }
  }

  return (
    <div className="flex flex-col items-center min-h-[80vh] space-y-24 py-12">
      <HeroSection />
      <DebateList debates={debates} onDelete={handleDelete} />
    </div>
  )
}
