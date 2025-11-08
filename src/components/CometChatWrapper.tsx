import { useState } from 'react';
import CometChatApp from '../CometChat/CometChatApp';
import ProfileEdit from './ProfileEdit';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { CometChatUIKit } from '@cometchat/chat-uikit-react';
import './CometChatWrapper.css';

export default function CometChatWrapper() {
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await CometChatUIKit.logout();
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (showProfileEdit) {
    return (
      <ProfileEdit onClose={() => setShowProfileEdit(false)} />
    );
  }

  return (
    <div className="cometchat-wrapper">
      <div className="cometchat-wrapper-header">
        <div className="cometchat-wrapper-logo">
          <img src="/logo.jpg" alt="Amatyma" />
          <span>Amatyma</span>
        </div>
        <div className="cometchat-wrapper-actions">
          <button
            className="cometchat-wrapper-menu-button"
            onClick={() => setShowMenu(!showMenu)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>

          {showMenu && (
            <div className="cometchat-wrapper-dropdown">
              <button onClick={() => {
                setShowMenu(false);
                setShowProfileEdit(true);
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Edit Profile
              </button>
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
