import { useState } from 'react'
import { usePWAInstall } from './usePWAInstall'
import type { InstallPlatform } from './usePWAInstall'
import './InstallPrompt.css'

// ── Share icon for the iOS "tap Share then Add to Home Screen" instruction
function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function PlusSquareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function platformLabel(platform: InstallPlatform): string {
  if (platform === 'ios') return 'iPhone / iPad'
  if (platform === 'android') return 'Android'
  return 'your device'
}

export default function InstallPrompt() {
  const { shouldShow, platform, promptInstall, dismiss } = usePWAInstall()
  const [showIOSSteps, setShowIOSSteps] = useState(false)

  if (!shouldShow) return null

  const isIOS = platform === 'ios'

  return (
    <div className="pwa-install" role="dialog" aria-label="Install Amatyma app">
      <div className="pwa-install__bar">
        <img className="pwa-install__icon" src="/icon-96x96.png" alt="Amatyma icon" />

        <div className="pwa-install__text">
          <span className="pwa-install__title">Install Amatyma</span>
          <span className="pwa-install__sub">
            {isIOS
              ? 'Add to your Home Screen for the full app experience'
              : `Install on ${platformLabel(platform)} for faster, offline access`}
          </span>
        </div>

        <div className="pwa-install__actions">
          {isIOS ? (
            <button
              className="pwa-install__btn pwa-install__btn--primary"
              onClick={() => setShowIOSSteps(true)}
            >
              How?
            </button>
          ) : (
            <button
              className="pwa-install__btn pwa-install__btn--primary"
              onClick={promptInstall}
            >
              Install
            </button>
          )}
          <button
            className="pwa-install__btn pwa-install__btn--close"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>
      </div>

      {/* iOS step-by-step instructions drawer */}
      {isIOS && showIOSSteps && (
        <div className="pwa-install__ios-steps">
          <p className="pwa-install__ios-heading">Add to Home Screen</p>
          <ol className="pwa-install__ios-list">
            <li>
              Tap the <strong>Share</strong> button <ShareIcon /> in your browser toolbar
            </li>
            <li>
              Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquareIcon />
            </li>
            <li>
              Tap <strong>"Add"</strong> in the top-right corner
            </li>
          </ol>
          <button
            className="pwa-install__btn pwa-install__btn--text"
            onClick={() => { setShowIOSSteps(false); dismiss() }}
          >
            Got it, thanks
          </button>
        </div>
      )}
    </div>
  )
}
