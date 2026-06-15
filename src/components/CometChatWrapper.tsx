import { useState } from 'react';
import CometChatApp from '../CometChat/CometChatApp';
import ProfileEdit from './ProfileEdit';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { removePushToken } from '../pwa/pushNotifications';
import { CometChatUIKit } from '@cometchat/chat-uikit-react';
import { usePWAInstall } from '../pwa/usePWAInstall';
import { useOnlineStatus } from '../pwa/useOnlineStatus';
import './CometChatWrapper.css';

interface Props {
  onLogout: () => void;
}

export default function CometChatWrapper({ onLogout }: Props) {
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { shouldShow: canInstall, isStandalone, promptInstall, dismiss: dismissInstall } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const handleLogout = async () => {
    const uid = auth.currentUser?.uid;
    try {
      // Stop this browser from receiving call/message pushes once signed out
      if (uid) await removePushToken(uid).catch(() => {});
      await CometChatUIKit.logout();
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      onLogout();
    }
  };

  if (showProfileEdit) {
    return <ProfileEdit onClose={() => setShowProfileEdit(false)} />;
  }

  return (
    <div className="cometchat-wrapper">

      {/* ── Offline indicator ── */}
      {!isOnline && (
        <div className="cometchat-offline-bar" role="alert">
          <span className="cometchat-offline-dot" />
          No internet connection — messages will send when you're back online
        </div>
      )}

      <div className="cometchat-wrapper-header">
        <div className="cometchat-wrapper-logo">
          <img src="/logo.png" alt="Amatyma" />
          <span>Amatyma</span>
        </div>

        <div className="cometchat-wrapper-actions">
          {/* ── Install button — only visible when installable and not yet installed ── */}
          {canInstall && !isStandalone && (
            <button
              className="cometchat-wrapper-install-btn"
              onClick={promptInstall}
              title="Install Amatyma app"
              aria-label="Install app"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install</span>
            </button>
          )}

          <button
            className="cometchat-wrapper-menu-button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5"  r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>

          {showMenu && (
            <div className="cometchat-wrapper-dropdown">
              <button onClick={() => { setShowMenu(false); setShowProfileEdit(true); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Edit Profile
              </button>

              {/* Install App entry in the menu (for iOS users who need manual steps) */}
              {canInstall && !isStandalone && (
                <button onClick={() => { setShowMenu(false); dismissInstall(); }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Install App
                </button>
              )}

              <button onClick={handleLogout} className="logout-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="cometchat-wrapper-content">
        <CometChatApp />
      </div>
    </div>
  );
}
