import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, firestore } from './firebase'
import { initCometChat, loginToCometChat } from './cometchat'
import AuthLogin from './components/AuthLogin'
import ProfileSetup from './components/ProfileSetup'
import CometChatWrapper from './components/CometChatWrapper'
import './App.css'

type AppView = 'login' | 'profileSetup' | 'chat'

function App() {
  const [currentView, setCurrentView] = useState<AppView>('login')
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Initialize CometChat
    const initializeApp = async () => {
      try {
        await initCometChat()
        console.log('CometChat initialized')

        // Check Firebase auth state
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log('User logged in:', user.uid)

            // Check if profile is complete
            const userDoc = await getDoc(doc(firestore, 'users', user.uid))

            if (userDoc.exists() && userDoc.data().displayName) {
              // Profile complete, login to CometChat
              try {
                await loginToCometChat(user.uid)
                setCurrentView('chat')
              } catch (err) {
                // loginToCometChat already retried 3 times — go to chat anyway.
                // CometChat will reconnect on its own once the socket is ready.
                console.error('CometChat login error after retries:', err)
                setCurrentView('chat')
              }
            } else {
              // Profile incomplete, show setup
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
      {currentView === 'login' && (
        <AuthLogin onLoginSuccess={handleLoginSuccess} />
      )}
      {currentView === 'profileSetup' && (
        <ProfileSetup onComplete={handleProfileSetupComplete} />
      )}
      {currentView === 'chat' && (
        <CometChatWrapper />
      )}
    </div>
  )
}

export default App
