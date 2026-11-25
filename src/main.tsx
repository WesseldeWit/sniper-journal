import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './stijl.css'

// MARK: Opslag vastzetten
void navigator.storage?.persist?.().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
