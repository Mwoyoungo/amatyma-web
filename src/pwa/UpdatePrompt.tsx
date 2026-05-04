import { useEffect } from 'react'
import { useServiceWorker } from './useServiceWorker'
import './UpdatePrompt.css'

export default function UpdatePrompt() {
  const {
    needRefresh,
    offlineReady,
    applyUpdate,
    dismissOfflineReady,
    dismissUpdate,
  } = useServiceWorker()

  // Auto-dismiss "offline ready" toast after 4 seconds
  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(dismissOfflineReady, 4000)
    return () => clearTimeout(t)
  }, [offlineReady, dismissOfflineReady])

  if (needRefresh) {
    return (
      <div className="pwa-update pwa-update--refresh" role="alert">
        <span className="pwa-update__icon">🔄</span>
        <span className="pwa-update__msg">New version of Amatyma is ready</span>
        <button className="pwa-update__btn pwa-update__btn--primary" onClick={applyUpdate}>
          Update
        </button>
        <button className="pwa-update__btn pwa-update__btn--dismiss" onClick={dismissUpdate} aria-label="Dismiss update">
          ✕
        </button>
      </div>
    )
  }

  if (offlineReady) {
    return (
      <div className="pwa-update pwa-update--offline" role="status">
        <span className="pwa-update__icon">✓</span>
        <span className="pwa-update__msg">App ready for offline use</span>
        <button className="pwa-update__btn pwa-update__btn--dismiss" onClick={dismissOfflineReady} aria-label="Dismiss">
          ✕
        </button>
      </div>
    )
  }

  return null
}
