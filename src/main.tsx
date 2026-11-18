// App entry. First redirects between the public site and the app address (hosts.ts), then renders App
// with the page-wide extras: upgrade prompts, the status bar and the support chat.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './authFetch'
import App from './App'
import UpgradeNotice from './components/UpgradeNotice'
import StatusBanner from './components/StatusBanner'
import ChatWidget from './components/ChatWidget'
import './index.css'
import { hostRedirect } from './hosts'
import { initAnalytics } from './analytics'

initAnalytics()

if (!hostRedirect())
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
        <UpgradeNotice />
        <StatusBanner />
        <ChatWidget />
      </BrowserRouter>
    </StrictMode>
  )
