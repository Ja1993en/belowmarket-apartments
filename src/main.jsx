import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './layouts/index.css'
import App from './App.jsx'
import { registerStaleDeploymentRecovery } from './utils/staleDeploymentRecovery'

registerStaleDeploymentRecovery()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
