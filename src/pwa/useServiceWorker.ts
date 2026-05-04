import { useRegisterSW } from 'virtual:pwa-register/react'

const SW_CHECK_INTERVAL_MS = 60 * 60 * 1000 // check for updates every hour

export interface UseServiceWorkerReturn {
  /** A new SW is installed and waiting — prompt user to refresh */
  needRefresh: boolean
  /** SW has cached everything needed for offline — show a confirmation toast */
  offlineReady: boolean
  /** Call to skip-waiting and reload with the new SW */
  applyUpdate: () => Promise<void>
  /** Dismiss the offlineReady notification */
  dismissOfflineReady: () => void
  /** Dismiss the needRefresh notification without updating */
  dismissUpdate: () => void
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return
      // Proactively poll for new versions every hour
      setInterval(() => {
        registration.update().catch(() => {
          // Silently ignore update-check failures when offline
        })
      }, SW_CHECK_INTERVAL_MS)
    },
    onRegisterError(error) {
      console.error('[SW] Registration failed:', error)
    },
    onOfflineReady() {
      console.info('[SW] App is ready for offline use.')
    },
    onNeedRefresh() {
      console.info('[SW] New version available.')
    },
  })

  const applyUpdate = async () => {
    await updateServiceWorker(true)
  }

  return {
    needRefresh,
    offlineReady,
    applyUpdate,
    dismissOfflineReady: () => setOfflineReady(false),
    dismissUpdate: () => setNeedRefresh(false),
  }
}
