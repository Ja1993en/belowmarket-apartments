import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './layouts/index.css'
import App from './App.jsx'
import { registerStaleDeploymentRecovery } from './utils/staleDeploymentRecovery'
import { initializeGoogleAdsTracking } from './utils/googleAdsTracking'

window.__BMA_DEPLOYMENT_MARKER__ = 'stale-asset-refresh-2026-07-09-v3'
registerStaleDeploymentRecovery()
initializeGoogleAdsTracking()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
