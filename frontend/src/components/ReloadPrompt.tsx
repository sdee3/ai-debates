import { useRegisterSW } from "virtual:pwa-register/react"
import { useState } from "react"

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.log("SW registered:", swUrl)
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error)
    },
  })

  const [dismissed, setDismissed] = useState(false)

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
    setDismissed(true)
  }

  if ((!offlineReady && !needRefresh) || dismissed) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
        <span className="text-sm text-foreground flex-1">
          {offlineReady
            ? "App ready to work offline"
            : "New version available. Update to get the latest features."}
        </span>
        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Reload
          </button>
        )}
        <button
          onClick={close}
          className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default ReloadPrompt
