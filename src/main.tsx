import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './authFetch'
import App from './App'
import UpgradeNotice from './components/UpgradeNotice'
import StatusBanner from './components/StatusBanner'
import './index.css'
import { hostRedirect } from './hosts'

if (!hostRedirect()) createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App /> 
      <UpgradeNotice />
      <StatusBanner />
    </BrowserRouter>
  </StrictMode>
)