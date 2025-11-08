import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CometChatProvider } from './CometChat/context/CometChatContext'
import '@cometchat/chat-uikit-react/css-variables.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CometChatProvider>
      <App />
    </CometChatProvider>
  </StrictMode>,
)
