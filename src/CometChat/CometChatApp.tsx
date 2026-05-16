/* eslint-disable react/no-unescaped-entities */
import './styles/CometChatApp.css';
import { AppContextProvider } from './context/AppContext';
import { CometChatHome } from './components/CometChatHome/CometChatHome';
import React, { useEffect, useState } from 'react';
import { useCometChatContext } from './context/CometChatContext';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import useSystemColorScheme from './customHooks';
import { CometChatUIKit, CometChatUIKitLoginListener } from '@cometchat/chat-uikit-react';
import '@cometchat/chat-uikit-react/css-variables.css';
import useThemeStyles from './customHook/useThemeStyles';

interface CometChatAppProps {
  /** Default user for the chat application (optional). */
  user?: CometChat.User;
  /** Default group for the chat application (optional). */
  group?: CometChat.Group;
  /** Show or hide group action messages (optional). */
  showGroupActionMessages?: boolean;
}

/**
 * Main application component for the CometChat Builder.
 *
 * @param {CometChatAppProps} props - The component props.
 * @returns {JSX.Element} The rendered CometChatApp component.
 */
function CometChatApp({ user, group, showGroupActionMessages }: CometChatAppProps) {
  // Use the synchronous login-listener cache as the initial value.
  // If loginToCometChat() already ran successfully, this is non-null
  // immediately and we never flash the loading or login-placeholder state.
  const [loggedInUser, setLoggedInUser] = useState<CometChat.User | null>(
    () => CometChatUIKitLoginListener.getLoggedInUser()
  );
  // sessionChecked = true as soon as we have a definitive answer
  const [sessionChecked, setSessionChecked] = useState(
    () => CometChatUIKitLoginListener.getLoggedInUser() !== null
  );
  const { styleFeatures, setStyleFeatures } = useCometChatContext();

  const systemTheme = useSystemColorScheme();
  useThemeStyles(styleFeatures, systemTheme, setStyleFeatures, loggedInUser);

  /**
   * Effect to handle login and logout listeners
   */
  useEffect(() => {
    CometChat.addLoginListener(
      'runnable-sample-app',
      new CometChat.LoginListener({
        loginSuccess: (user: CometChat.User) => {
          setLoggedInUser(user);
          setSessionChecked(true);
        },
        logoutSuccess: () => {
          setLoggedInUser(null);
        },
      })
    );

    return () => CometChat.removeLoginListener('runnable-sample-app');
  }, []);

  /**
   * Fallback async session check.
   * Only runs if the synchronous check returned null (user not yet in the
   * listener cache). Retries up to 5 × 600 ms to handle the post-init
   * timing gap where login() resolved but the cache hasn't settled.
   */
  useEffect(() => {
    // If we already have a user from the synchronous check, do nothing
    if (sessionChecked) return;

    let cancelled = false;
    const checkUser = async () => {
      for (let i = 0; i < 5; i++) {
        // Prefer synchronous listener cache on each iteration
        const syncUser = CometChatUIKitLoginListener.getLoggedInUser();
        if (syncUser) {
          if (!cancelled) { setLoggedInUser(syncUser); setSessionChecked(true); }
          return;
        }
        // Async SDK call as secondary source
        const asyncUser = await CometChatUIKit.getLoggedinUser().catch(() => null);
        if (cancelled) return;
        if (asyncUser) {
          setLoggedInUser(asyncUser);
          setSessionChecked(true);
          return;
        }
        await new Promise((res) => setTimeout(res, 600));
      }
      // Exhausted retries — mark done (will show LoginPlaceholder)
      if (!cancelled) setSessionChecked(true);
    };

    checkUser();
    return () => { cancelled = true; };
  }, [sessionChecked]);

  if (!sessionChecked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', background: '#fff' }}>
        <img src="/logo.png" alt="Amatyma" style={{ width: 64, height: 64, borderRadius: 16 }} />
        <span style={{ fontFamily: 'sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px' }}>Amatyma</span>
      </div>
    );
  }

  return (
    <div className="CometChatApp">
      <AppContextProvider>
        {loggedInUser && <CometChatHome defaultGroup={group} defaultUser={user} showGroupActionMessages={showGroupActionMessages} />}
      </AppContextProvider>
    </div>
  );
}

export default CometChatApp;

