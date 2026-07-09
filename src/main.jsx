import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './layouts/index.css'
import App from './App.jsx'
import { registerStaleDeploymentRecovery } from './utils/staleDeploymentRecovery'

window.__BMA_DEPLOYMENT_MARKER__ = 'stale-asset-refresh-2026-07-09-v2'
registerStaleDeploymentRecovery()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
