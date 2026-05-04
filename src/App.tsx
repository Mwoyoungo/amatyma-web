import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, firestore } from './firebase'
import { initCometChat, loginToCometChat } from './cometchat'
import AuthLogin from './components/AuthLogin'
import ProfileSetup from './components/ProfileSetup'
import CometChatWrapper from './components/CometChatWrapper'
import InstallPrompt from './pwa/InstallPrompt'
import UpdatePrompt from './pwa/UpdatePrompt'
import './App.css'

type AppView = 'login' | 'profileSetup' | 'chat'

function App() {
  const [currentView, setCurrentView] = useState<AppView>('login')
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initCometChat()
        console.log('CometChat initialized')

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log('User logged in:', user.uid)

            const userDoc = await getDoc(doc(firestore, 'users', user.uid))

            if (userDoc.exists() && userDoc.data().displayName) {
              try {
                await loginToCometChat(user.uid)
                setCurrentView('chat')
              } catch (err) {
                console.error('CometChat login error after retries:', err)
                setCurrentView('chat')
              }
            } else {
              setCurrentView('profileSetup')
            }
          } else {
            console.log('User not logged in')
            setCurrentView('login')
          }
          setIsInitializing(false)
        })

        return unsubscribe
      } catch (err) {
        console.error('Initialization error:', err)
        setError('Failed to initialize application')
        setIsInitializing(false)
      }
    }

    initializeApp()
  }, [])

  const handleLoginSuccess = (username: string, email: string) => {
    console.log('Login successful:', username, email)
  }

  const handleProfileSetupComplete = () => {
    setCurrentView('chat')
  }

  if (isInitializing) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }

  return (
    <div className="app">
      {/* SW update banner — always mounted, renders only when relevant */}
      <UpdatePrompt />

      {currentView === 'login' && (
        <AuthLogin onLoginSuccess={handleLoginSuccess} />
      )}
      {currentView === 'profileSetup' && (
        <ProfileSetup onComplete={handleProfileSetupComplete} />
      )}
      {currentView === 'chat' && (
        <CometChatWrapper />
      )}

      {/* Install prompt — shown on all views; hides itself when not eligible */}
      <InstallPrompt />
    </div>
  )
}

export default App
