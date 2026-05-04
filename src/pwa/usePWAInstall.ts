import { useState, useEffect, useRef, useCallback } from 'react'

// Browser interface not yet in all TS lib versions
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'android' | 'ios' | 'desktop' | null

export interface UsePWAInstallReturn {
  /** Show the install UI (false once installed or dismissed for 7 days) */
  shouldShow: boolean
  /** Platform-specific prompt type */
  platform: InstallPlatform
  /** true when running as an installed PWA (standalone mode) */
  isStandalone: boolean
  /** Trigger the native browser install prompt (Android / Desktop) */
  promptInstall: () => Promise<void>
  /** User dismissed — hides banner for 7 days */
  dismiss: () => void
}

const DISMISS_KEY = 'pwa-install-dismissed-at'
const DISMISS_DAYS = 7

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent.toLowerCase()
  const isIOS =
    /iphone|ipad|ipod/.test(ua) &&
    !(window as { MSStream?: unknown }).MSStream
  if (isIOS) return 'ios'

  // Samsung Internet also fires beforeinstallprompt — treat like Android
  const isAndroid = /android/.test(ua)
  if (isAndroid) return 'android'

  return 'desktop'
}

function wasDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const days = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24)
  return days < DISMISS_DAYS
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isDismissed, setIsDismissed] = useState(wasDismissedRecently)
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode)
  const [platform, setPlatform] = useState<InstallPlatform>(null)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already running as installed app — nothing to show
    if (isStandaloneMode()) {
      setIsStandalone(true)
      return
    }

    const detectedPlatform = detectPlatform()
    setPlatform(detectedPlatform)

    if (detectedPlatform === 'ios') {
      // iOS never fires beforeinstallprompt — we show manual instructions
      setIsInstallable(true)
      return
    }

    // Android / Desktop: wait for the browser's install eligibility signal
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setIsInstallable(true)
    }

    const onAppInstalled = () => {
      deferredPrompt.current = null
      setIsInstallable(false)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    deferredPrompt.current = null
  }, [])

  const dismiss = useCallback(() => {
    setIsDismissed(true)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }, [])

  const shouldShow = isInstallable && !isStandalone && !isDismissed

  return { shouldShow, platform, isStandalone, promptInstall, dismiss }
}
